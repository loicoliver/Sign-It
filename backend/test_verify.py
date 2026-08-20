import os
import django
import base64

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import Document, Signature, User
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

def verify_signature_manual(public_key_pem, message, signature_base64):
    """Test manuel de vérification"""
    try:
        signature_bytes = base64.b64decode(signature_base64)
        public_key = load_pem_public_key(public_key_pem.encode('utf-8'))
        
        print(f"  Message à vérifier: {message}")
        print(f"  Message bytes length: {len(message.encode('utf-8'))}")
        print(f"  Signature length: {len(signature_bytes)} bytes")
        
        # Vérification RSA-SHA256
        public_key.verify(
            signature_bytes,
            message.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        print("  ✅ SIGNATURE VALIDE")
        return True
    except Exception as e:
        print(f"  ❌ SIGNATURE INVALIDE: {e}")
        return False

# Récupérer le document et les signatures
doc = Document.objects.first()
if not doc:
    print("❌ Aucun document trouvé")
    exit(1)

print(f"\n📄 Document: {doc.title}")
print(f"   File hash: {doc.file_hash}")
print(f"   Version: {doc.version}\n")

# Vérifier chaque signature
sigs = doc.signatures.all().order_by('signed_at')
print(f"✍️ Vérification de {sigs.count()} signature(s):\n")

for i, sig in enumerate(sigs, 1):
    print(f"#{i} Signature de {sig.signer.username}:")
    print(f"  Payload signé (DB): {sig.payload_signed}")
    print(f"  File hash (attendu): {doc.file_hash}")
    print(f"  Match payload? {sig.payload_signed == doc.file_hash}")
    
    # Vérifier avec le payload en DB
    print(f"\n  Test 1: Vérification avec payload en DB ({sig.payload_signed[:20]}...)")
    verify_signature_manual(sig.signer.public_key, sig.payload_signed, sig.signature_value)
    
    # Vérifier avec le file_hash
    print(f"\n  Test 2: Vérification avec file_hash ({doc.file_hash[:20]}...)")
    verify_signature_manual(sig.signer.public_key, doc.file_hash, sig.signature_value)
    
    print("\n" + "="*80 + "\n")
