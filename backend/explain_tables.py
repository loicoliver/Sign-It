#!/usr/bin/env python
"""
Script pour expliquer les relations entre les tables et visualiser qui a signé quoi
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import Document, Signature, AuthorizedSigner, User

print("\n" + "="*100)
print("EXPLICATION DES TABLES ET RELATIONS")
print("="*100)

print("""
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            SCHÉMA DES RELATIONS                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

    api_user                api_document              api_authorizedsigner
  ┌──────────┐            ┌──────────────┐          ┌────────────────────┐
  │ id       │◄───────────│ owner_id     │          │ id                 │
  │ username │            │ title        │◄─────────│ document_id        │
  │ email    │            │ file_hash    │          │ user_id            │──────┐
  │ public_key│           │ status       │          │ authorized_at      │      │
  └──────────┘            │ version      │          └────────────────────┘      │
       ▲                  └──────────────┘                     │                │
       │                         ▲                             ▼                │
       │                         │                    ┌─────────────────┐      │
       │                         │                    │ Qui PEUT signer │      │
       │                         └────────────────────│ le document ?   │      │
       │                                              └─────────────────┘      │
       │                  api_signature                                        │
       │                ┌──────────────────┐                                   │
       └────────────────│ signer_id        │◄──────────────────────────────────┘
                        │ document_id      │
                        │ signature_value  │
                        │ payload_signed   │
                        │ signed_at        │
                        │ previous_sig_id  │
                        └──────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ Qui A SIGNÉ     │
                        │ le document ?   │
                        └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ DIFFÉRENCE IMPORTANTE :                                                              │
│                                                                                      │
│ • api_authorizedsigner  = Qui a la PERMISSION de signer (pas encore signé)          │
│ • api_signature         = Qui a EFFECTIVEMENT signé (signature enregistrée)         │
└─────────────────────────────────────────────────────────────────────────────────────┘
""")

print("\n" + "="*100)
print("EXEMPLE DÉTAILLÉ POUR CHAQUE DOCUMENT")
print("="*100)

documents = Document.objects.all().select_related('owner')

for doc in documents:
    print(f"\n{'┌' + '─'*98 + '┐'}")
    print(f"│ 📄 DOCUMENT #{doc.id} : {doc.title[:70]:<70} │")
    print(f"{'└' + '─'*98 + '┘'}")
    
    print(f"\n  Propriétaire    : {doc.owner.username}")
    print(f"  Status          : {doc.status}")
    print(f"  Hash SHA-256    : {doc.file_hash}")
    print(f"  Créé le         : {doc.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # AUTORISATIONS (qui PEUT signer)
    authorized = AuthorizedSigner.objects.filter(document=doc).select_related('user')
    print(f"\n  {'─'*94}")
    print(f"  📋 SIGNATAIRES AUTORISÉS (table: api_authorizedsigner)")
    print(f"  {'─'*94}")
    print(f"  Ces personnes ont la PERMISSION de signer ce document")
    print()
    
    if authorized:
        for auth in authorized:
            print(f"    ✓ {auth.user.username:<15} (User ID: {auth.user.id:>2})")
    else:
        print(f"    ⚠️  Aucun signataire autorisé")
    
    # SIGNATURES (qui A signé)
    signatures = Signature.objects.filter(document=doc).select_related('signer').order_by('signed_at')
    print(f"\n  {'─'*94}")
    print(f"  ✍️  SIGNATURES EFFECTUÉES (table: api_signature)")
    print(f"  {'─'*94}")
    print(f"  Ces personnes ont RÉELLEMENT signé le document avec leur clé privée")
    print()
    
    if signatures:
        for i, sig in enumerate(signatures, 1):
            print(f"    Signature #{i}")
            print(f"      • Signataire       : {sig.signer.username}")
            print(f"      • Date signature   : {sig.signed_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"      • Signature crypto : {sig.signature_value[:60]}...")
            print(f"      • Payload signé    : {sig.payload_signed[:60]}...")
            if sig.previous_signature:
                print(f"      • Chaînage        : Lié à la signature #{i-1} (ID: {sig.previous_signature.id})")
            else:
                print(f"      • Chaînage        : Première signature (pas de précédente)")
            print()
    else:
        print(f"    ⚠️  Aucune signature effectuée")
    
    # COMPARAISON
    print(f"  {'─'*94}")
    print(f"  📊 RÉSUMÉ")
    print(f"  {'─'*94}")
    authorized_users = set(auth.user.username for auth in authorized)
    signed_users = set(sig.signer.username for sig in signatures)
    
    print(f"    Autorisés à signer : {len(authorized_users)}")
    print(f"    Ont déjà signé     : {len(signed_users)}")
    
    if signed_users:
        print(f"\n    ✅ Qui a signé : {', '.join(sorted(signed_users))}")
    
    pending = authorized_users - signed_users
    if pending:
        print(f"    ⏳ En attente  : {', '.join(sorted(pending))}")
    
    if signed_users == authorized_users and signed_users:
        print(f"\n    🎉 STATUS: COMPLÉTÉ - Tous les signataires autorisés ont signé !")
    elif signed_users and signed_users < authorized_users:
        print(f"\n    ⚠️  STATUS: EN COURS - Certains signataires n'ont pas encore signé")
    elif not signed_users and authorized_users:
        print(f"\n    ⏳ STATUS: EN ATTENTE - Aucune signature pour l'instant")

print("\n" + "="*100)
print("COMMENT UTILISER SQLite VIEWER")
print("="*100)

print("""
1. Ouvre db.sqlite3 dans VS Code avec l'extension SQLite Viewer

2. Pour voir QUI PEUT SIGNER un document :
   ──────────────────────────────────────────
   Table : api_authorizedsigner
   Colonnes importantes :
     • document_id  → ID du document concerné
     • user_id      → ID de l'utilisateur autorisé
   
   Jointure avec api_user pour voir le nom :
     SELECT u.username, d.title 
     FROM api_authorizedsigner a
     JOIN api_user u ON a.user_id = u.id
     JOIN api_document d ON a.document_id = d.id

3. Pour voir QUI A SIGNÉ un document :
   ──────────────────────────────────────────
   Table : api_signature
   Colonnes importantes :
     • document_id       → ID du document signé
     • signer_id         → ID de l'utilisateur qui a signé
     • signature_value   → Signature cryptographique RSA (base64)
     • signed_at         → Date et heure de la signature
     • previous_signature_id → Chaînage (signature précédente)
   
   Jointure pour voir qui a signé quoi :
     SELECT u.username, d.title, s.signed_at, s.signature_value
     FROM api_signature s
     JOIN api_user u ON s.signer_id = u.id
     JOIN api_document d ON s.document_id = d.id
     ORDER BY s.signed_at

4. Pour voir TOUS les détails d'un document (propriétaire, signataires, signatures) :
   ──────────────────────────────────────────────────────────────────────────────────
   Table : api_document
   Colonne importante :
     • owner_id → ID du propriétaire du document
   
   Puis croiser avec api_authorizedsigner et api_signature pour avoir le tableau complet.
""")

print("\n" + "="*100 + "\n")
