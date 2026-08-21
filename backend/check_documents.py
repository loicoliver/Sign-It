#!/usr/bin/env python
"""
Script pour visualiser les documents et leurs signatures dans la base de données
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import Document, Signature, AuthorizedSigner, AuditLog
from django.db import connection

print("\n" + "="*80)
print("STRUCTURE DES TABLES DE LA BASE DE DONNÉES")
print("="*80)

# Lister toutes les tables
with connection.cursor() as cursor:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = cursor.fetchall()
    
    print("\nTables disponibles :")
    for table in tables:
        print(f"  - {table[0]}")

print("\n" + "="*80)
print("DOCUMENTS")
print("="*80)

documents = Document.objects.all().select_related('owner')

if not documents:
    print("\n❌ Aucun document trouvé.")
else:
    for doc in documents:
        print(f"\n{'─'*80}")
        print(f"ID           : {doc.id}")
        print(f"Titre        : {doc.title}")
        print(f"Propriétaire : {doc.owner.username}")
        print(f"Status       : {doc.status}")
        print(f"Hash SHA-256 : {doc.file_hash}")
        print(f"Créé le      : {doc.created_at}")
        print(f"Version      : {doc.version}")
        
        # Signataires autorisés
        authorized = AuthorizedSigner.objects.filter(document=doc).select_related('user')
        print(f"\nSignataires autorisés ({authorized.count()}) :")
        for auth in authorized:
            print(f"  - {auth.user.username} (ID: {auth.user.id})")
        
        # Signatures
        signatures = Signature.objects.filter(document=doc).select_related('signer')
        print(f"\nSignatures effectuées ({signatures.count()}) :")
        for sig in signatures:
            print(f"  - {sig.signer.username}")
            print(f"    Signé le : {sig.signed_at}")
            print(f"    Signature (50 premiers caractères) : {sig.signature_value[:50]}...")

print("\n" + "="*80)
print("RÉSUMÉ DES SIGNATURES")
print("="*80)

total_docs = Document.objects.count()
total_sigs = Signature.objects.count()
total_authorized = AuthorizedSigner.objects.count()

print(f"\nDocuments totaux           : {total_docs}")
print(f"Signatures totales         : {total_sigs}")
print(f"Autorisations totales      : {total_authorized}")

print("\n" + "="*80)
print("JOURNAL D'AUDIT (10 dernières entrées)")
print("="*80)

logs = AuditLog.objects.all().order_by('-timestamp')[:10]
if logs:
    for log in logs:
        print(f"\n[{log.timestamp}] {log.action}")
        print(f"  Document ID: {log.document_id}")
        print(f"  User ID: {log.user_id}")
        print(f"  Détails: {log.details}")
else:
    print("\nAucune entrée d'audit.")

print("\n" + "="*80)
print("DÉTAIL DE LA TABLE 'api_document'")
print("="*80)

with connection.cursor() as cursor:
    cursor.execute("PRAGMA table_info(api_document)")
    columns = cursor.fetchall()
    
    print("\nColonnes de la table Document :")
    for col in columns:
        col_id, name, col_type, not_null, default, pk = col
        null_str = "NOT NULL" if not_null else "NULL"
        pk_str = "PRIMARY KEY" if pk else ""
        print(f"  {name:20} {col_type:15} {null_str:10} {pk_str}")

print("\n" + "="*80)
print("DÉTAIL DE LA TABLE 'api_signature'")
print("="*80)

with connection.cursor() as cursor:
    cursor.execute("PRAGMA table_info(api_signature)")
    columns = cursor.fetchall()
    
    print("\nColonnes de la table Signature :")
    for col in columns:
        col_id, name, col_type, not_null, default, pk = col
        null_str = "NOT NULL" if not_null else "NULL"
        pk_str = "PRIMARY KEY" if pk else ""
        print(f"  {name:20} {col_type:15} {null_str:10} {pk_str}")

print("\n" + "="*80 + "\n")
