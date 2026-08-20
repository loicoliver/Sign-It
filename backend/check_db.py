import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import Document, Signature, User

# Vérifier les documents
docs = Document.objects.all()
print(f"\n📄 Documents: {docs.count()}")
for doc in docs:
    print(f"  - {doc.title} (version {doc.version}, hash: {doc.file_hash[:20]}...)")

# Vérifier les signatures
sigs = Signature.objects.all()
print(f"\n✍️ Signatures: {sigs.count()}")
for sig in sigs:
    print(f"  - {sig.signer.username}: payload={sig.payload_signed[:40]}...")
    print(f"    signature={sig.signature_value[:60]}...")

# Vérifier les clés publiques
users = User.objects.all()
print(f"\n👤 Utilisateurs: {users.count()}")
for user in users:
    if user.public_key:
        key_lines = user.public_key.split('\n')
        key_preview = key_lines[1][:50] if len(key_lines) > 1 else "N/A"
        print(f"  - {user.username}: clé={key_preview}...")
    else:
        print(f"  - {user.username}: PAS DE CLÉ PUBLIQUE")
