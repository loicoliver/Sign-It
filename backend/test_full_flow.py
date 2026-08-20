"""
Test complet du flux de signature : génération clés, inscription, upload, signature, vérification
"""
import os
import sys
import django
import hashlib
import base64
from io import BytesIO

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Document, AuthorizedSigner, Signature
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

User = get_user_model()

print("=" * 80)
print("🧪 TEST COMPLET DU FLUX DE SIGNATURE")
print("=" * 80)

# ============================================================================
# ÉTAPE 1 : Générer une paire de clés RSA 512-bit (comme le mobile)
# ============================================================================
print("\n📝 ÉTAPE 1: Génération clés RSA 1024-bit...")

private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=1024,
    backend=default_backend()
)

public_key = private_key.public_key()

private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption()
).decode('utf-8')

public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
).decode('utf-8')

print(f"✅ Clés générées (1024-bit)")
print(f"   Clé publique: {public_pem.split()[1][:50]}...")

# ============================================================================
# ÉTAPE 2 : Créer un utilisateur avec la clé publique
# ============================================================================
print("\n👤 ÉTAPE 2: Création utilisateur 'alice_test'...")

# Supprimer l'ancien utilisateur test s'il existe
User.objects.filter(username='alice_test').delete()

user = User.objects.create_user(
    username='alice_test',
    password='Password123!',
    public_key=public_pem
)

print(f"✅ Utilisateur créé (ID: {user.id})")

# ============================================================================
# ÉTAPE 3 : Créer un faux document PDF
# ============================================================================
print("\n📄 ÉTAPE 3: Création d'un document PDF de test...")

# Créer un PDF simple
buffer = BytesIO()
c = canvas.Canvas(buffer, pagesize=A4)
c.drawString(100, 750, "Document de Test")
c.drawString(100, 730, "Ce document sera signé électroniquement.")
c.save()

pdf_content = buffer.getvalue()
pdf_hash = hashlib.sha256(pdf_content).hexdigest()

print(f"✅ PDF créé ({len(pdf_content)} bytes)")
print(f"   Hash SHA-256: {pdf_hash}")

# Sauvegarder le PDF dans media/documents
os.makedirs('media/documents', exist_ok=True)
pdf_path = 'media/documents/test_document.pdf'
with open(pdf_path, 'wb') as f:
    f.write(pdf_content)

# Créer le document dans la DB
document = Document.objects.create(
    title="Test Document",
    file=pdf_path.replace('media/', ''),
    owner=user,
    file_hash=pdf_hash,
    status='PENDING',
    version=1
)

# Ajouter l'utilisateur comme signataire autorisé
AuthorizedSigner.objects.create(document=document, user=user)

print(f"✅ Document créé (ID: {document.id}, version: {document.version})")

# ============================================================================
# ÉTAPE 4 : Signer le document (simulation mobile)
# ============================================================================
print(f"\n✍️ ÉTAPE 4: Signature du document...")

# Mobile : récupère le file_hash via l'API
payload_to_sign = document.file_hash
print(f"   Payload à signer: {payload_to_sign}")

# Mobile : signe avec RSA-SHA256
# IMPORTANT : privateKey.sign() dans node-forge fait déjà le hash SHA-256
# Donc on envoie directement le payload texte, pas le hash
signature_bytes = private_key.sign(
    payload_to_sign.encode('utf-8'),  # Le payload texte
    padding.PKCS1v15(),
    hashes.SHA256()  # L'algorithme de hash (fait automatiquement par sign)
)

signature_base64 = base64.b64encode(signature_bytes).decode('utf-8')
print(f"   Signature générée: {signature_base64[:60]}...")

# ============================================================================
# ÉTAPE 5 : Backend vérifie et enregistre la signature
# ============================================================================
print(f"\n🔐 ÉTAPE 5: Vérification backend...")

try:
    # Vérifier la signature
    public_key.verify(
        signature_bytes,
        payload_to_sign.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    print(f"✅ Signature cryptographique VALIDE")
    is_valid = True
except Exception as e:
    print(f"❌ Signature INVALIDE: {e}")
    is_valid = False
    sys.exit(1)

# Enregistrer la signature
signature = Signature.objects.create(
    document=document,
    signer=user,
    signature_value=signature_base64,
    payload_signed=payload_to_sign,
    previous_signature=None,
    is_valid=is_valid
)

print(f"✅ Signature enregistrée (ID: {signature.id})")

# Incrémenter la version
document.version += 1
document.status = 'COMPLETED'
document.save()

print(f"✅ Document mis à jour (version: {document.version}, status: {document.status})")

# ============================================================================
# ÉTAPE 6 : Vérifier la chaîne de signatures
# ============================================================================
print(f"\n🛡️ ÉTAPE 6: Vérification de la chaîne...")

# Vérifier que le file_hash n'a pas changé
print(f"   Hash original: {pdf_hash}")
print(f"   Hash en DB: {document.file_hash}")
print(f"   Hash match: {pdf_hash == document.file_hash}")

# Vérifier la signature
sig = document.signatures.first()
print(f"\n   Signature #{sig.id} par {sig.signer.username}:")
print(f"     Payload signé: {sig.payload_signed}")
print(f"     File hash: {document.file_hash}")
print(f"     Match: {sig.payload_signed == document.file_hash}")

try:
    public_key.verify(
        base64.b64decode(sig.signature_value),
        document.file_hash.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    print(f"     ✅ Vérification cryptographique: VALIDE")
    overall_valid = True
except Exception as e:
    print(f"     ❌ Vérification cryptographique: INVALIDE ({e})")
    overall_valid = False

# ============================================================================
# RÉSULTAT FINAL
# ============================================================================
print("\n" + "=" * 80)
if overall_valid and pdf_hash == document.file_hash:
    print("🎉 TEST RÉUSSI ! Toute la chaîne est valide !")
    print("=" * 80)
    sys.exit(0)
else:
    print("❌ TEST ÉCHOUÉ ! Il y a un problème dans la chaîne.")
    print("=" * 80)
    sys.exit(1)
