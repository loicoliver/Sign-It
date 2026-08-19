# Sign It

## Description

Sign It est une application mobile de signature électronique permettant aux utilisateurs de signer des documents numériques de manière sécurisée grâce à la cryptographie asymétrique et au chaînage de signatures.

L'application permet à un utilisateur de créer un compte, d'importer un document PDF et d'autoriser d'autres personnes à le signer.

Chaque utilisateur possède une paire de clés cryptographiques :

- **Une clé privée** : générée et conservée uniquement sur son téléphone (protégée par biométrie). Elle ne quitte jamais l'appareil.
- **Une clé publique** : générée lors de l'inscription et envoyée au serveur pour y être stockée.

La clé privée permet à l'utilisateur de créer sa signature numérique. La clé publique permet au serveur de vérifier l'authenticité de la signature sans jamais posséder la clé privée.

Pendant le développement, l'authentification biométrique est simulée si l'appareil ne dispose pas de capteur d'empreinte ou de reconnaissance faciale.

---

## Fonctionnement

### 1. Création du compte & Clés
1. Inscription de l'utilisateur sur l'application mobile.
2. Génération de la paire de clés cryptographiques (Clé Privée / Clé Publique).
3. Stockage sécurisé de la clé privée dans l'espace sécurisé du téléphone (Keychain / SecureStore).
4. Envoi de la clé publique au serveur et suppression de celle-ci du stockage local du téléphone.

### 2. Importation et Partage d'un document
1. Un utilisateur (le propriétaire) importe un document PDF dans l'application.
2. Le document est enregistré sur le serveur et associé au propriétaire.
3. Le propriétaire sélectionne et autorise d'autres utilisateurs de la plateforme à consulter et signer ce document.
4. Les utilisateurs autorisés reçoivent le document dans leur section **"Documents à signer"**.

### 3. Signature du document & Chaînage (Dépendances)
Lorsqu'un utilisateur souhaite signer un document :
1. L'application demande une validation biométrique (ou simulée).
2. L'application calcule l'empreinte cryptographique SHA-256 du document (et inclut la signature précédente s'il y en a une).
3. L'empreinte est signée avec la clé privée de l'utilisateur.
4. La signature numérique créée est envoyée au serveur.
5. Le serveur vérifie la signature à l'aide de la clé publique de l'utilisateur stockée sur le serveur.
6. En cas de succès, le serveur enregistre la nouvelle signature et met à jour l'historique du document.

### 4. Vérification et Chaîne de Confiance
Le serveur vérifie chaque signature avec la clé publique du signataire correspondant.
Grâce au chaînage des signatures :
- **Utilisateur A** signe `Hash(Document)`
- **Utilisateur B** signe `Hash(Document) + Signature_A`
- **Utilisateur C** signe `Hash(Document) + Signature_B`

Cela permet de garantir :
- L'identité de chaque signataire.
- L'intégrité absolue du document (aucun octet n'a été modifié).
- L'ordre infalsifiable des signatures successives.

### 5. Historique et Traçabilité
Chaque action (création, ajout d'un signataire, signature effectuée) est enregistrée avec son horodatage et affichée dans l'historique d'audit du document.