import base64
import io
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from .models import Document, AuthorizedSigner, Signature, AuditLog

User = get_user_model()

class SignItApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Génération d'une vraie paire de clés RSA 2048-bit pour User A
        self.private_key_a = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        self.public_key_pem_a = self.private_key_a.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

        # Génération d'une paire de clés pour User B
        self.private_key_b = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        self.public_key_pem_b = self.private_key_b.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

        # Inscription de User A
        self.user_a_data = {
            'username': 'usera',
            'email': 'usera@example.com',
            'password': 'Password123!',
            'public_key': self.public_key_pem_a
        }
        res_a = self.client.post('/api/auth/register/', self.user_a_data, format='json')
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)
        self.user_a = User.objects.get(username='usera')

        # Inscription de User B
        self.user_b_data = {
            'username': 'userb',
            'email': 'userb@example.com',
            'password': 'Password123!',
            'public_key': self.public_key_pem_b
        }
        res_b = self.client.post('/api/auth/register/', self.user_b_data, format='json')
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)
        self.user_b = User.objects.get(username='userb')

        # Connexion de User A
        login_res = self.client.post('/api/auth/login/', {
            'username': 'usera',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.token_a = login_res.data['access']

    def test_full_signature_flow_and_chaining(self):
        # 1. User A importe un document PDF
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')
        fake_pdf = io.BytesIO(b"%PDF-1.4 Fake PDF Content for Sign It Test")
        fake_pdf.name = "test_document.pdf"

        upload_res = self.client.post('/api/documents/', {
            'title': 'Contrat Commercial',
            'file': fake_pdf
        }, format='multipart')

        self.assertEqual(upload_res.status_code, status.HTTP_201_CREATED)
        doc_id = upload_res.data['id']
        file_hash = upload_res.data['file_hash']
        self.assertTrue(len(file_hash) == 64)

        # 2. User A autorise User B à signer
        auth_res = self.client.post(f'/api/documents/{doc_id}/authorize/', {
            'user_id': self.user_b.id
        }, format='json')
        self.assertEqual(auth_res.status_code, status.HTTP_201_CREATED)

        # 3. User A signe le document (Payload = file_hash)
        payload_a = file_hash.encode('utf-8')
        sig_bytes_a = self.private_key_a.sign(
            payload_a,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        sig_b64_a = base64.b64encode(sig_bytes_a).decode('utf-8')

        sign_res_a = self.client.post(f'/api/documents/{doc_id}/sign/', {
            'signature_value': sig_b64_a
        }, format='json')
        self.assertEqual(sign_res_a.status_code, status.HTTP_201_CREATED)

        # 4. User B se connecte et signe (Chaînage : Payload = file_hash + ":" + sig_b64_a)
        login_b = self.client.post('/api/auth/login/', {
            'username': 'userb',
            'password': 'Password123!'
        }, format='json')
        token_b = login_b.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')

        payload_b = f"{file_hash}:{sig_b64_a}".encode('utf-8')
        sig_bytes_b = self.private_key_b.sign(
            payload_b,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        sig_b64_b = base64.b64encode(sig_bytes_b).decode('utf-8')

        sign_res_b = self.client.post(f'/api/documents/{doc_id}/sign/', {
            'signature_value': sig_b64_b
        }, format='json')
        self.assertEqual(sign_res_b.status_code, status.HTTP_201_CREATED)

        # 5. Vérification globale par l'API /verify/
        verify_res = self.client.get(f'/api/documents/{doc_id}/verify/')
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_res.data['overall_valid'])
        self.assertTrue(verify_res.data['file_integrity_ok'])
        self.assertEqual(verify_res.data['status'], 'COMPLETED')
        self.assertEqual(len(verify_res.data['signatures_chain']), 2)
