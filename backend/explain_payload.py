#!/usr/bin/env python
"""
Script pour expliquer le payload_signed et le chaînage cryptographique
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import Document, Signature

print("\n" + "="*100)
print("EXPLICATION DU PAYLOAD_SIGNED ET DU CHAÎNAGE CRYPTOGRAPHIQUE")
print("="*100)

print("""
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ QU'EST-CE QUE LE PAYLOAD_SIGNED ?                                                    │
└──────────────────────────────────────────────────────────────────────────────────────┘

Le "payload_signed" est LA DONNÉE qui a été signée cryptographiquement.
C'est le HASH SHA-256 de ce que l'utilisateur a vraiment signé.

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ PROCESSUS DE SIGNATURE :                                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

1️⃣  PREMIÈRE SIGNATURE (pas de précédente) :
    ────────────────────────────────────────
    Payload brut      = file_hash du document
    Payload hashé     = SHA-256(file_hash)
    Signature crypto  = RSA_sign(clé_privée, payload_hashé)
    
    Enregistré en BDD :
    • payload_signed        = payload_hashé (SHA-256 du file_hash)
    • signature_value       = signature crypto (base64)
    • previous_signature_id = NULL (première signature)


2️⃣  SIGNATURES SUIVANTES (avec chaînage) :
    ──────────────────────────────────────
    Payload brut      = file_hash + ":" + signature_précédente
    Payload hashé     = SHA-256(file_hash:signature_précédente)
    Signature crypto  = RSA_sign(clé_privée, payload_hashé)
    
    Enregistré en BDD :
    • payload_signed        = payload_hashé
    • signature_value       = signature crypto (base64)
    • previous_signature_id = ID de la signature précédente

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ POURQUOI C'EST IMPORTANT ?                                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

✅ INTÉGRITÉ DU DOCUMENT : On signe le hash du document (file_hash)
✅ CHAÎNAGE DE CONFIANCE : Chaque signature inclut la précédente
✅ ORDRE GARANTI : Impossible de réordonner les signatures
✅ INFALSIFIABLE : Modifier une signature casse toute la chaîne

""")

print("\n" + "="*100)
print("EXEMPLES RÉELS DE VOS DOCUMENTS")
print("="*100)

# Document avec une seule signature
doc1 = Document.objects.get(id=1)
sig1 = Signature.objects.filter(document=doc1).first()

print(f"\n┌{'─'*98}┐")
print(f"│ 📄 DOCUMENT #1 : {doc1.title[:70]:<70} │")
print(f"└{'─'*98}┘")
print(f"\nSignature unique (pas de chaînage)")
print(f"{'─'*98}")
print(f"Hash du document (file_hash) :")
print(f"  {doc1.file_hash}")
print(f"\nPayload signé (payload_signed) :")
print(f"  {sig1.payload_signed}")
print(f"\nSignature cryptographique (signature_value) :")
print(f"  {sig1.signature_value[:80]}...")
print(f"\nExplication :")
print(f"  Le payload_signed est le SHA-256 du file_hash du document.")
print(f"  Mimi a signé ce hash avec sa clé privée RSA.")
print(f"  La signature peut être vérifiée avec sa clé publique.")

# Document avec plusieurs signatures (chaînage)
doc3 = Document.objects.get(id=3)
signatures = Signature.objects.filter(document=doc3).order_by('signed_at')

print(f"\n┌{'─'*98}┐")
print(f"│ 📄 DOCUMENT #3 : {doc3.title[:70]:<70} │")
print(f"└{'─'*98}┘")
print(f"\n2 signatures avec chaînage cryptographique")
print(f"{'─'*98}")
print(f"Hash du document (file_hash) :")
print(f"  {doc3.file_hash}")

for i, sig in enumerate(signatures, 1):
    print(f"\n{'▼'*50}")
    print(f"SIGNATURE #{i} - {sig.signer.username}")
    print(f"{'▼'*50}")
    
    if not sig.previous_signature:
        print(f"\nType : PREMIÈRE SIGNATURE")
        print(f"Payload brut qui a été signé :")
        print(f"  {doc3.file_hash}")
        print(f"\nPayload hashé (SHA-256) stocké en BDD :")
        print(f"  {sig.payload_signed}")
        print(f"\nSignature cryptographique RSA :")
        print(f"  {sig.signature_value[:80]}...")
    else:
        prev_sig = sig.previous_signature
        print(f"\nType : SIGNATURE CHAÎNÉE (liée à signature #{i-1})")
        print(f"Payload brut qui a été signé :")
        print(f"  file_hash : signature_précédente")
        print(f"  {doc3.file_hash}:{prev_sig.signature_value[:40]}...")
        print(f"\nPayload hashé (SHA-256) stocké en BDD :")
        print(f"  {sig.payload_signed}")
        print(f"\nSignature cryptographique RSA :")
        print(f"  {sig.signature_value[:80]}...")
        print(f"\nLien vers signature précédente :")
        print(f"  previous_signature_id = {prev_sig.id}")

print(f"\n{'='*100}")
print("VÉRIFICATION DE LA CHAÎNE")
print(f"{'='*100}")

print(f"""
Pour vérifier l'intégrité complète du document #{doc3.id} :

1️⃣  Vérifier la signature #1 (Thanos) :
   • Reconstruire le payload : SHA-256(file_hash)
   • Comparer avec payload_signed en BDD → doit être identique
   • Vérifier la signature RSA avec la clé publique de Thanos

2️⃣  Vérifier la signature #2 (Bryan) :
   • Reconstruire le payload : SHA-256(file_hash + ":" + signature_de_Thanos)
   • Comparer avec payload_signed en BDD → doit être identique
   • Vérifier la signature RSA avec la clé publique de Bryan

✅ Si toutes les vérifications passent → Document AUTHENTIQUE et INTÈGRE
❌ Si une seule échoue → Document MODIFIÉ ou signature INVALIDE

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ AVANTAGES DU CHAÎNAGE :                                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

🔗 Impossible de supprimer une signature au milieu
🔗 Impossible d'ajouter une signature antidatée
🔗 Impossible de réordonner les signatures
🔗 L'ordre chronologique est garanti cryptographiquement

C'est comme une BLOCKCHAIN simplifiée ! 🔐
""")

print("\n" + "="*100 + "\n")
