#!/usr/bin/env python
"""
Script pour comparer les clés publiques et vérifier qu'elles sont toutes uniques
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'signit_backend.settings')
django.setup()

from api.models import User

print("\n" + "="*80)
print("COMPARAISON DES CLÉS PUBLIQUES - VÉRIFICATION D'UNICITÉ")
print("="*80)

users = User.objects.all()

print(f"\nNombre total d'utilisateurs : {users.count()}\n")

keys_dict = {}
for user in users:
    if user.public_key:
        keys_dict[user.username] = user.public_key

# Afficher chaque clé publique complète
for username, key in keys_dict.items():
    print(f"\n{'='*80}")
    print(f"Utilisateur : {username}")
    print(f"{'='*80}")
    print(key)

# Vérifier l'unicité
print(f"\n{'='*80}")
print("VÉRIFICATION D'UNICITÉ")
print(f"{'='*80}")

unique_keys = set(keys_dict.values())
print(f"\nNombre de clés publiques : {len(keys_dict)}")
print(f"Nombre de clés uniques   : {len(unique_keys)}")

if len(keys_dict) == len(unique_keys):
    print(f"\n✅ RÉSULTAT : Toutes les clés publiques sont UNIQUES !")
    print(f"   Chaque utilisateur a sa propre paire de clés.")
else:
    print(f"\n❌ ALERTE : Il y a des clés publiques en double !")
    print(f"   Certains utilisateurs partagent la même clé (ANORMAL).")
    
print("\n" + "="*80 + "\n")
