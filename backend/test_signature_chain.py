"""
Test du chaînage de signatures (signature chain)
Vérifie que chaque signature inclut les signatures précédentes
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
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

User = get_user_model()

print("=" * 80)
print("🔗 TEST DU CHAÎNAGE DE SIGNATURES")
print("=" * 80)

# Nettoyer les données de test
User.objects.filter(username__startswith='test_').delete()
Document.objects.filter(title='Test Chain Document').delete()

# ============================================================================
# Créer 2 utilisateurs avec leurs clés
# ============================================================================
print("\n👥 Création de 2 utilisateurs...")

users = []
for i, name in enumerate(['alice', 'bob'], 1):
    username = f'test_{name}'
    
    # Générer clés RSA 1024-bit
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=1024,
        backend=default_backend()
    )
    
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    user = User.objects.create_user(
        username=username,
        password='Password123!',
        public_key=public_pem
    )
    
    users.append({
        'user': user,
        'private_key': private_key,
        'name': name
    })
    
    print(f"  ✅ {name} créé (clés 1024-bit)")

# ============================================================================
# Créer un document PDF
# ============================================================================
print("\n📄 Création du document...")

buffer = BytesIO()
c = canvas.Canvas(buffer, pagesize=A4)
c.drawString(100, 750, "Document de Test - Chaînage de Signatures")
c.save()

pdf_content = buffer.getvalue()
pdf_hash = hashlib.sha256(pdf_content).hexdigest()

os.makedirs('media/documents', exist_ok=True)
pdf_path = 'media/documents/test_chain.pdf'
with open(pdf_path, 'wb') as f:
    f.write(pdf_content)

document = Document.objects.create(
    title="Test Chain Document",
    file=pdf_path.replace('media/', ''),
    owner=users[0]['user'],
    file_hash=pdf_hash,
    status='PENDING',
    version=1
)

for u in users:
    AuthorizedSigner.objects.create(document=document, user=u['user'])

print(f"  ✅ Document créé (hash: {pdf_hash[:20]}...)")

# ============================================================================
# Signature 1 : Alice signe le document
# ============================================================================
print(f"\n✍️  Signature 1 : Alice...")

# Alice : payload = file_hash (première signature)
payload_alice = document.file_hash
payload_alice_hash = hashlib.sha256(payload_alice.encode('utf-8')).hexdigest()

print(f"  Payload Alice: {payload_alice[:40]}...")
print(f"  Hash du payload: {payload_alice_hash[:40]}...")

# Signer le hash du payload
signature_alice = users[0]['private_key'].sign(
    payload_alice_hash.encode('utf-8'),
    padding.PKCS1v15(),
    hashes.SHA256()
)
signature_alice_b64 = base64.b64encode(signature_alice).decode('utf-8')

# Vérifier
try:
    users[0]['private_key'].public_key().verify(
        signature_alice,
        payload_alice_hash.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    print(f"  ✅ Signature Alice VALIDE")
except:
    print(f"  ❌ Signature Alice INVALIDE")
    sys.exit(1)

# Enregistrer
sig1 = Signature.objects.create(
    document=document,
    signer=users[0]['user'],
    signature_value=signature_alice_b64,
    payload_signed=payload_alice,
    previous_signature=None,
    is_valid=True
)

print(f"  ✅ Signature enregistrée (ID: {sig1.id})")

# ============================================================================
# Signature 2 : Bob signe document + signature Alice (CHAÎNAGE)
# ============================================================================
print(f"\n✍️  Signature 2 : Bob (avec chaînage)...")

# Bob : payload = file_hash + signature_alice (chaînage)
payload_bob = f"{document.file_hash}:{signature_alice_b64}"
payload_bob_hash = hashlib.sha256(payload_bob.encode('utf-8')).hexdigest()

print(f"  Payload Bob (chaîné): {payload_bob[:60]}...")
print(f"  Hash du payload: {payload_bob_hash[:40]}...")

# Signer le hash du payload chaîné
signature_bob = users[1]['private_key'].sign(
    payload_bob_hash.encode('utf-8'),
    padding.PKCS1v15(),
    hashes.SHA256()
)
signature_bob_b64 = base64.b64encode(signature_bob).decode('utf-8')

# Vérifier
try:
    users[1]['private_key'].public_key().verify(
        signature_bob,
        payload_bob_hash.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    print(f"  ✅ Signature Bob VALIDE")
except:
    print(f"  ❌ Signature Bob INVALIDE")
    sys.exit(1)

# Enregistrer avec lien vers signature précédente
sig2 = Signature.objects.create(
    document=document,
    signer=users[1]['user'],
    signature_value=signature_bob_b64,
    payload_signed=payload_bob,
    previous_signature=sig1,
    is_valid=True
)

print(f"  ✅ Signature enregistrée (ID: {sig2.id}, previous: {sig1.id})")

# ============================================================================
# Vérification de la chaîne complète
# ============================================================================
print(f"\n🔍 Vérification de la chaîne...")

signatures = document.signatures.order_by('signed_at')
prev_sig_value = None
all_valid = True

for i, sig in enumerate(signatures, 1):
    print(f"\n  Signature #{i} par {sig.signer.username}:")
    
    # Reconstituer le payload attendu
    if prev_sig_value:
        expected_payload = f"{document.file_hash}:{prev_sig_value}"
        print(f"    Chaînage: Inclut signature précédente")
    else:
        expected_payload = document.file_hash
        print(f"    Première signature (pas de chaînage)")
    
    # Hash du payload
    expected_hash = hashlib.sha256(expected_payload.encode('utf-8')).hexdigest()
    
    # Vérifier
    print(f"    Payload en DB: {sig.payload_signed[:40]}...")
    print(f"    Payload attendu: {expected_payload[:40]}...")
    print(f"    Match: {sig.payload_signed == expected_payload}")
    
    # Vérification crypto
    try:
        sig_bytes = base64.b64decode(sig.signature_value)
        sig.signer.public_key_obj = serialization.load_pem_public_key(
            sig.signer.public_key.encode('utf-8'),
            backend=default_backend()
        )
        
        sig.signer.public_key_obj.verify(
            sig_bytes,
            expected_hash.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        print(f"    ✅ Vérification crypto: VALIDE")
    except Exception as e:
        print(f"    ❌ Vérification crypto: INVALIDE ({e})")
        all_valid = False
    
    prev_sig_value = sig.signature_value

# ============================================================================
# Test : Modification de la signature intermédiaire
# ============================================================================
print(f"\n🔒 Test d'intégrité: Modification de la signature d'Alice...")

# Simuler une tentative de modification
fake_payload_bob = f"{document.file_hash}:FAKE_SIGNATURE_ALICE"
fake_hash = hashlib.sha256(fake_payload_bob.encode('utf-8')).hexdigest()

try:
    users[1]['private_key'].public_key().verify(
        base64.b64decode(signature_bob_b64),
        fake_hash.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    print(f"  ❌ PROBLÈME: La signature falsifiée est acceptée !")
    all_valid = False
except:
    print(f"  ✅ Signature de Bob REJETTE le payload falsifié (chaîne protégée)")

# ============================================================================
# RÉSULTAT
# ============================================================================
print("\n" + "=" * 80)
if all_valid:
    print("🎉 TEST RÉUSSI ! Le chaînage de signatures fonctionne correctement")
    print("   - Chaque signature inclut les signatures précédentes")
    print("   - Impossible de modifier une signature intermédiaire")
    print("   - L'ordre des signatures est garanti")
    print("=" * 80)
    sys.exit(0)
else:
    print("❌ TEST ÉCHOUÉ ! Problème dans le chaînage")
    print("=" * 80)
    sys.exit(1)
