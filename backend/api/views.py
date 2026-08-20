import hashlib
import base64
import os
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.conf import settings
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa, ed25519, ec

from .models import Document, AuthorizedSigner, Signature, AuditLog
from .serializers import (
    UserSerializer, RegisterSerializer, DocumentSerializer,
    AuthorizedSignerSerializer, SignatureSerializer, AuditLogSerializer
)
from .pdf_utils import add_signature_page_to_pdf, create_new_version_path

User = get_user_model()

def verify_crypto_signature(public_key_pem: str, message_bytes: bytes, signature_base64: str) -> bool:
    """
    Vérifie cryptographiquement une signature numérique avec une clé publique PEM (RSA, ECDSA ou Ed25519).
    """
    try:
        signature_bytes = base64.b64decode(signature_base64)
        public_key = load_pem_public_key(public_key_pem.encode('utf-8'))

        if isinstance(public_key, rsa.RSAPublicKey):
            # Vérification standard RSA avec SHA-256
            public_key.verify(
                signature_bytes,
                message_bytes,
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        elif isinstance(public_key, ed25519.Ed25519PublicKey):
            public_key.verify(signature_bytes, message_bytes)
            return True
        elif isinstance(public_key, ec.EllipticCurvePublicKey):
            public_key.verify(signature_bytes, message_bytes, ec.ECDSA(hashes.SHA256()))
            return True
        else:
            return False
    except Exception as e:
        print(f"Erreur de vérification cryptographique : {e}")
        return False


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Retourne les autres utilisateurs pour pouvoir les inviter
        return User.objects.exclude(id=self.request.user.id)


class DocumentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Option param filter: 'created', 'assigned', or all accessible
        filter_type = request.query_params.get('filter', 'all')
        if filter_type == 'created':
            documents = Document.objects.filter(owner=request.user)
        elif filter_type == 'assigned':
            documents = Document.objects.filter(authorized_signers__user=request.user)
        else:
            documents = (Document.objects.filter(owner=request.user) | 
                         Document.objects.filter(authorized_signers__user=request.user)).distinct()
        
        serializer = DocumentSerializer(documents.order_by('-created_at'), many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        title = request.data.get('title')
        file_obj = request.FILES.get('file')

        if not file_obj or not title:
            return Response({'error': 'Le titre et le fichier PDF sont requis.'}, status=status.HTTP_400_BAD_REQUEST)

        # Calcul de l'empreinte SHA-256 du fichier PDF
        sha256 = hashlib.sha256()
        for chunk in file_obj.chunks():
            sha256.update(chunk)
        file_hash = sha256.hexdigest()

        document = Document.objects.create(
            title=title,
            file=file_obj,
            owner=request.user,
            file_hash=file_hash,
            status='PENDING'
        )

        # Ajouter automatiquement le propriétaire comme signataire autorisé
        AuthorizedSigner.objects.create(document=document, user=request.user)

        # Audit log
        AuditLog.objects.create(
            document=document,
            user=request.user,
            action="Création du document",
            details=f"Document '{title}' importé avec le hash SHA-256 : {file_hash}"
        )

        serializer = DocumentSerializer(document, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        # Vérification des autorisations
        if document.owner != request.user and not AuthorizedSigner.objects.filter(document=document, user=request.user).exists():
            return Response({'error': 'Accès non autorisé à ce document.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DocumentSerializer(document, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        if document.owner != request.user:
            return Response({'error': 'Seul le propriétaire peut supprimer ce document.'}, status=status.HTTP_403_FORBIDDEN)

        document.delete()
        return Response({'message': 'Document supprimé avec succès.'}, status=status.HTTP_204_NO_CONTENT)


class AddAuthorizedSignerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        if document.owner != request.user:
            return Response({'error': 'Seul le propriétaire peut ajouter des signataires.'}, status=status.HTTP_403_FORBIDDEN)

        target_user_id = request.data.get('user_id')
        target_user = get_object_or_404(User, pk=target_user_id)

        signer, created = AuthorizedSigner.objects.get_or_create(document=document, user=target_user)
        if created:
            AuditLog.objects.create(
                document=document,
                user=request.user,
                action="Ajout d'un signataire",
                details=f"Utilisateur '{target_user.username}' ajouté comme signataire autorisé."
            )
            return Response({'message': f"Utilisateur {target_user.username} ajouté comme signataire."}, status=status.HTTP_201_CREATED)
        else:
            return Response({'message': "Cet utilisateur est déjà autorisé à signer."}, status=status.HTTP_200_OK)


class SignDocumentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        signer = request.user

        # 1. Vérifier si l'utilisateur est autorisé à signer
        if not AuthorizedSigner.objects.filter(document=document, user=signer).exists():
            return Response({'error': "Vous n'êtes pas autorisé à signer ce document."}, status=status.HTTP_403_FORBIDDEN)

        # 2. Vérifier s'il a déjà signé
        if Signature.objects.filter(document=document, signer=signer).exists():
            return Response({'error': "Vous avez déjà signé ce document."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Récupérer la signature envoyée par l'app mobile
        signature_value = request.data.get('signature_value')
        if not signature_value:
            return Response({'error': "La valeur de la signature numérique est requise."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Payload à vérifier : uniquement le hash du fichier (pas de chaînage)
        # Chaque signataire signe le document original indépendamment
        payload_to_verify = document.file_hash
        
        print(f"[Backend] Payload à vérifier: {payload_to_verify}")

        # 5. Récupérer la clé publique de l'utilisateur
        if not signer.public_key:
            return Response({'error': "Clé publique de l'utilisateur introuvable sur le serveur."}, status=status.HTTP_400_BAD_REQUEST)

        # 6. Vérification cryptographique RSA-SHA256
        is_valid = verify_crypto_signature(
            public_key_pem=signer.public_key,
            message_bytes=payload_to_verify.encode('utf-8'),  # Payload texte, pas hashé
            signature_base64=signature_value
        )

        if not is_valid:
            AuditLog.objects.create(
                document=document,
                user=signer,
                action="Échec de signature",
                details="Tentative de signature avec une clé privée ne correspondant pas à la clé publique enregistrée."
            )
            return Response({'error': "Signature cryptographique invalide ou non conforme."}, status=status.HTTP_400_BAD_REQUEST)

        # 7. Sauvegarde de la signature valide (sans chaînage)
        new_signature = Signature.objects.create(
            document=document,
            signer=signer,
            signature_value=signature_value,
            payload_signed=payload_to_verify,  # file_hash seulement
            previous_signature=None,  # Pas de chaînage
            is_valid=True
        )

        # 8. Création d'une nouvelle version du PDF avec la page de signatures
        try:
            # Récupérer toutes les signatures (incluant la nouvelle)
            all_signatures = document.signatures.order_by('signed_at')
            signatures_data = [
                {
                    'signer': sig.signer.username,
                    'signed_at': sig.signed_at,
                    'signature_value': sig.signature_value
                }
                for sig in all_signatures
            ]
            
            # Incrémenter le numéro de version
            document.version += 1
            version_number = document.version
            
            # Chemin du fichier actuel
            current_file_path = document.file.path
            
            # Générer le chemin de la nouvelle version
            new_version_path = create_new_version_path(current_file_path, version_number)
            
            # Ajouter la page de signatures au PDF
            add_signature_page_to_pdf(
                original_pdf_path=current_file_path,
                signatures_data=signatures_data,
                output_pdf_path=new_version_path
            )
            
            # Mettre à jour le document pour pointer vers la nouvelle version
            # Calculer le chemin relatif pour le FileField
            relative_path = os.path.relpath(new_version_path, settings.MEDIA_ROOT)
            document.file.name = relative_path
            
            # NE PAS recalculer le hash - garder le hash du document original
            # Le file_hash doit rester constant pour que toutes les signatures soient valides
            
            document.save()
            
            AuditLog.objects.create(
                document=document,
                user=signer,
                action="Nouvelle version PDF créée",
                details=f"Version {version_number} générée avec page de signatures (hash: {document.file_hash[:16]}...)"
            )
            
        except Exception as e:
            # Si la génération du PDF échoue, on continue quand même
            AuditLog.objects.create(
                document=document,
                user=signer,
                action="Erreur génération PDF",
                details=f"Impossible de générer la nouvelle version du PDF : {str(e)}"
            )

        # 9. Mise à jour du statut du document
        total_authorized = document.authorized_signers.count()
        total_signed = document.signatures.count()
        if total_signed >= total_authorized:
            document.status = 'COMPLETED'
        else:
            document.status = 'IN_PROGRESS'
        document.save()

        # 10. Audit Log
        AuditLog.objects.create(
            document=document,
            user=signer,
            action="Signature effectuée",
            details=f"Document signé par {signer.username} (Chaîne de signature #{new_signature.id})."
        )

        serializer = SignatureSerializer(new_signature)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VerifyDocumentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        document = get_object_or_404(Document, pk=pk)

        # 1. Note : Le fichier actuel contient maintenant les pages de signatures,
        # donc son hash ne correspondra plus au hash original stocké en DB.
        # C'est normal et attendu. On vérifie seulement les signatures cryptographiques.
        
        # Pour info : calculer le hash actuel du fichier
        try:
            document.file.open('rb')
            sha256 = hashlib.sha256()
            for chunk in document.file.chunks():
                sha256.update(chunk)
            current_file_hash = sha256.hexdigest()
            document.file.close()
        except Exception as e:
            current_file_hash = "ERROR"

        # Le fichier a été modifié (pages signatures ajoutées), c'est normal
        file_has_been_modified = (current_file_hash != document.file_hash)

        # 2. Vérification de toutes les signatures (indépendantes, pas de chaînage)
        signatures = document.signatures.order_by('signed_at')
        chain_verification = []
        overall_valid = signatures.exists()  # Valide si au moins une signature existe

        for sig in signatures:
            # Chaque signature signe le file_hash original
            expected_payload = document.file_hash
            payload_match = (sig.payload_signed == expected_payload)
            
            # Vérification cryptographique RSA-SHA256
            crypto_valid = verify_crypto_signature(
                public_key_pem=sig.signer.public_key,
                message_bytes=expected_payload.encode('utf-8'),
                signature_base64=sig.signature_value
            )

            sig_status = {
                'signature_id': sig.id,
                'signer_username': sig.signer.username,
                'signed_at': sig.signed_at,
                'payload_match': payload_match,
                'crypto_valid': crypto_valid,
                'is_valid': crypto_valid and payload_match  # Ne dépend plus de file_integrity
            }

            if not sig_status['is_valid']:
                overall_valid = False

            chain_verification.append(sig_status)

        return Response({
            'document_id': document.id,
            'document_title': document.title,
            'original_hash': document.file_hash,
            'current_file_hash': current_file_hash,
            'file_integrity_ok': not file_has_been_modified,  # False = modifié (pages signatures ajoutées)
            'file_has_signature_pages': file_has_been_modified,  # True = pages ajoutées
            'overall_valid': overall_valid,
            'status': document.status,
            'total_authorized_signers': document.authorized_signers.count(),
            'total_signatures': signatures.count(),
            'signatures_chain': chain_verification
        })
