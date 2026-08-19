# Sign It - Task List

## 1. Mise en place du projet

- [x] Créer le projet React Native (Expo / TypeScript)
- [x] Configurer TypeScript
- [x] Installer les dépendances nécessaires (Crypto, SecureStore, Biométrie, Document Picker, Node-Forge)
- [x] Créer le projet Django Backend
- [x] Installer Django REST Framework et SimpleJWT
- [x] Configurer SQLite pour le développement
- [x] Configurer Git et GitHub
- [x] Connecter React Native à l'API Django

## 2. Authentification & Profils

- [x] Créer le modèle utilisateur (Django CustomUser avec `public_key`)
- [x] Créer la page d'inscription sur l'application mobile
- [x] Créer la page de connexion
- [x] Implémenter l'authentification JWT (Access & Refresh Tokens)
- [x] Implémenter la déconnexion
- [x] Créer la page de profil utilisateur

## 3. Gestion des clés cryptographiques

- [x] Générer une paire de clés (Clé publique / Clé privée RSA 2048-bit) lors de l'inscription
- [x] Stocker la clé privée de manière sécurisée sur le téléphone (`SecureStore` / `Keychain`)
- [x] S'assurer que la clé privée ne quitte **jamais** le téléphone
- [x] Envoyer la clé publique au serveur Django lors de l'inscription
- [x] Enregistrer la clé publique dans la base de données du serveur
- [x] Ne conserver que la clé privée dans le stockage local du téléphone

## 4. Authentification biométrique (Simulée & Réelle)

- [x] Créer le module d'authentification biométrique
- [x] Ajouter la simulation d'empreinte digitale (pour dev sans capteur)
- [x] Exiger l'authentification biométrique avant l'accès à la clé privée
- [x] Bloquer la signature sans validation biométrique réussie
- [x] Prévoir le fallback pour la vraie biométrie (`expo-local-authentication`)

## 5. Gestion et Partage des documents

- [x] Créer l'écran d'accueil avec filtres ("Tous", "Mes Créations", "À Signer")
- [x] Ajouter l'importation d'un document PDF depuis le téléphone (`expo-document-picker`)
- [x] Transmettre et enregistrer le document PDF sur le serveur Backend
- [x] Ajouter la recherche et la sélection d'utilisateurs pour autoriser la signature
- [x] Associer les signataires autorisés au document en base de données
- [x] Afficher la liste des documents avec leur statut (`PENDING`, `IN_PROGRESS`, `COMPLETED`)
- [x] Afficher les détails et métadonnées du document PDF

## 6. Signature numérique & Cryptographie

- [x] Calculer l'empreinte SHA-256 du document PDF sur le téléphone
- [x] Déclencher la biométrie pour récupérer la clé privée locale
- [x] Signer l'empreinte SHA-256 (et dépendance précédente) avec la clé privée RSA
- [x] Transmettre la signature numérique Base64 au serveur Django
- [x] Enregistrer la signature, l'horodatage et l'ID du signataire en base de données

## 7. Vérification de la signature par le serveur

- [x] Récupérer la clé publique du signataire enregistrée sur le serveur
- [x] Vérifier la signature cryptographique RSA grâce à la clé publique
- [x] Vérifier l'intégrité du document PDF (détection des modifications de hash)
- [x] Valider la signature si la vérification réussit
- [x] Rejeter la signature si le document ou la clé a été falsifié
- [x] Transmettre le résultat de la vérification à l'application mobile

## 8. Signatures multiples & Chaînage (Dépendances)

- [x] Permettre au propriétaire d'inviter plusieurs signataires
- [x] Implémenter le chaînage cryptographique : chaque signature dérive du $Hash(PDF) + Signature_{N-1}$
- [x] Conserver l'historique ordonné des signatures en dépendance
- [x] Mettre à jour le statut du document lorsque tous les signataires ont signé
- [x] Afficher la liste complète des personnes ayant signé avec les dates et heures
- [x] Offrir la vérification globale de toute la chaîne de signatures par le serveur

## 9. Historique d'audit & Traçabilité

- [x] Créer le journal d'historique (Audit Log) d'un document
- [x] Enregistrer l'événement de création du document
- [x] Enregistrer l'invitation de chaque signataire
- [x] Enregistrer chaque événement de signature
- [x] Afficher la chronologie détaillée dans l'application mobile

## 10. Interface utilisateur & Ergonomie

- [x] Créer la navigation (Stack Navigation)
- [x] Écran d'accueil et tableau de bord avec filtres
- [x] Écran de détail d'un document
- [x] Écran du processus de signature (Biométrie + Confirmation)
- [x] Écran d'ajout/recherche des signataires autorisés
- [x] Écran de l'historique d'audit et modal de vérification
- [x] Messages de confirmation et gestion des erreurs

## 11. Tests & Validation

- [x] Tester le flux complet d'inscription et génération de clés
- [x] Vérifier que la clé privée n'est jamais exposée sur le réseau
- [x] Tester l'authentification biométrique (simulée et réelle)
- [x] Tester l'importation d'un document PDF et son attribution
- [x] Tester la signature individuelle et sa vérification backend
- [x] Tester le chaînage des signatures multiples (User A -> User B)
- [x] Tester la tentative de modification d'un document signé (détection de falsification)

## 12. Finalisation & Livraison

- [x] Corriger les bugs et gérer les cas d'erreur
- [x] Optimiser l'interface et le design (Thème Sombre Slate/Sky Blue moderne)
- [x] Nettoyer le code source et ajouter des commentaires
- [x] Réaliser un audit de sécurité des endpoints et du stockage de clé
- [x] Rédiger la documentation technique et le guide utilisateur de Sign It