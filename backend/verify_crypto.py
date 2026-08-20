import os
import django
import base64

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import Document, Signature
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

def verify_signature(sig):
    """Vérifie cryptographiquement une signature RSA"""
    try:
        # Charger la clé publique du signataire
        public_key = load_pem_public_key(sig.signer.public_key.encode('utf-8'))
        
        # Décoder la signature Base64
        signature_bytes = base64.b64decode(sig.signature_value)
        
        # Reconstituer le payload signé
        message_bytes = sig.payload_signed.encode('utf-8')
        
        # Vérifier la signature RSA avec SHA-256
        public_key.verify(
            signature_bytes,
            message_bytes,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return True, "Signature cryptographiquement valide ✅"
    except Exception as e:
        return False, f"Signature invalide ❌: {type(e).__name__}"

print("\n" + "="*70)
print("         VÉRIFICATION CRYPTOGRAPHIQUE DES SIGNATURES")
print("="*70 + "\n")

documents = Document.objects.all()

for doc in documents:
    print(f"📄 Document: {doc.title}\n")
    
    signatures = Signature.objects.filter(document=doc).order_by('signed_at')
    
    for i, sig in enumerate(signatures, 1):
        print(f"Signature #{i} - {sig.signer.username}:")
        is_valid, message = verify_signature(sig)
        print(f"   {message}")
        
        # Vérifier l'intégrité du chaînage
        if sig.previous_signature:
            prev_included = sig.previous_signature.signature_value in sig.payload_signed
            print(f"   Chaînage: {'✅ Inclut signature précédente' if prev_included else '❌ Chaînage rompu'}")
        else:
            print(f"   Chaînage: Première signature (signe directement le hash)")
        
        print()

print("="*70 + "\n")
