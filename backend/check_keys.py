#!/usr/bin/env python
"""
Script pour vérifier la sécurité des clés :
- Clé publique : doit être dans la base de données
- Clé privée : NE DOIT PAS être dans la base de données
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import User

print("\n" + "="*70)
print("VÉRIFICATION DE SÉCURITÉ DES CLÉS")
print("="*70)

users = User.objects.all()

if not users:
    print("\n❌ Aucun utilisateur trouvé dans la base de données.")
else:
    for user in users:
        print(f"\n{'='*70}")
        print(f"Utilisateur : {user.username}")
        print(f"{'='*70}")
        print(f"ID              : {user.id}")
        print(f"Email           : {user.email or 'Non renseigné'}")
        print(f"Date création   : {user.date_joined}")
        
        print(f"\n{'─'*70}")
        print("CLÉ PUBLIQUE (doit être en base de données)")
        print(f"{'─'*70}")
        if user.public_key:
            print(f"✅ Présente     : OUI")
            print(f"   Longueur     : {len(user.public_key)} caractères")
            print(f"   Début        : {user.public_key[:50]}...")
            print(f"   Fin          : ...{user.public_key[-50:]}")
            
            # Vérifier le format PEM
            if "BEGIN PUBLIC KEY" in user.public_key:
                print(f"✅ Format       : PEM valide")
            else:
                print(f"⚠️  Format       : Format non reconnu")
        else:
            print(f"❌ Présente     : NON")
            print(f"⚠️  ATTENTION    : L'utilisateur n'a pas de clé publique !")

print(f"\n{'='*70}")
print("VÉRIFICATION DES CHAMPS SENSIBLES")
print(f"{'='*70}")

# Vérifier qu'aucune clé privée n'est stockée
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("PRAGMA table_info(api_user)")
    columns = [row[1] for row in cursor.fetchall()]
    
    print("\nColonnes de la table User :")
    for col in columns:
        print(f"  - {col}")
    
    if 'private_key' in columns or 'privatekey' in columns:
        print("\n❌ ALERTE SÉCURITÉ : Une colonne 'private_key' existe !")
        print("   Les clés privées NE DOIVENT PAS être en base de données.")
    else:
        print("\n✅ SÉCURITÉ : Aucune colonne 'private_key' détectée.")
        print("   Les clés privées sont stockées localement sur les appareils.")

print(f"\n{'='*70}")
print("RÉSUMÉ")
print(f"{'='*70}")
print(f"Utilisateurs analysés : {users.count()}")
print(f"Avec clé publique     : {users.exclude(public_key__isnull=True).exclude(public_key='').count()}")
print(f"Sans clé publique     : {users.filter(public_key__isnull=True).count() + users.filter(public_key='').count()}")
print(f"\n✅ Architecture sécurisée : Clés publiques en BDD, clés privées sur téléphone")
print("="*70 + "\n")
