import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import User, Document, Signature, AuthorizedSigner

print("\n" + "="*70)
print("              VÉRIFICATION DES SIGNATURES - SIGN IT")
print("="*70 + "\n")

# Lister tous les documents
documents = Document.objects.all()

if not documents.exists():
    print("❌ Aucun document dans la base de données.\n")
else:
    for doc in documents:
        print(f"📄 Document #{doc.id}: {doc.title}")
        print(f"   Propriétaire: {doc.owner.username}")
        print(f"   Statut: {doc.status}")
        print(f"   Hash SHA-256: {doc.file_hash[:32]}...")
        print(f"   Créé le: {doc.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Signataires autorisés
        authorized = AuthorizedSigner.objects.filter(document=doc)
        print(f"\n   👥 Signataires autorisés: {authorized.count()}")
        for auth in authorized:
            print(f"      - {auth.user.username}")
        
        # Signatures
        signatures = Signature.objects.filter(document=doc).order_by('signed_at')
        print(f"\n   ✍️  Signatures enregistrées: {signatures.count()}")
        
        if signatures.exists():
            for i, sig in enumerate(signatures, 1):
                print(f"\n   Signature #{i}:")
                print(f"      Signataire: {sig.signer.username}")
                print(f"      Date: {sig.signed_at.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"      Valide: {'✅ Oui' if sig.is_valid else '❌ Non'}")
                print(f"      Payload signé: {sig.payload_signed[:50]}...")
                print(f"      Signature (Base64): {sig.signature_value[:60]}...")
                if sig.previous_signature:
                    print(f"      Dépend de: Signature #{sig.previous_signature.id} par {sig.previous_signature.signer.username}")
                else:
                    print(f"      Dépend de: Aucune (première signature)")
        else:
            print("      (Aucune signature pour le moment)")
        
        print("\n" + "-"*70 + "\n")

# Statistiques globales
print("\n" + "="*70)
print("                         STATISTIQUES")
print("="*70)
print(f"Total utilisateurs: {User.objects.count()}")
print(f"Total documents: {Document.objects.count()}")
print(f"Total signatures: {Signature.objects.count()}")
print("="*70 + "\n")
