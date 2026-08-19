Exactement ! Vous avez tout à fait compris la philosophie du système.

📱 1. Dans la vraie vie (Production / Utilisation réelle)
Dans un cas réel, Alice a son propre téléphone et Bob a son propre téléphone.

Alice génère sa clé privée sur son téléphone A.
Bob génère sa clé privée sur son téléphone B.
La clé privée de Bob ne se trouve jamais sur le téléphone d'Alice.
🧪 2. Pour vos tests et démonstrations
Vous avez aujourd'hui deux possibilités :

Option A : Simulation 100% réaliste (Recommandée pour une démo)
Pour avoir une simulation parfaite comme en conditions réelles :

Appareil 1 (ex: votre téléphone ou émulateur) : Vous êtes connecté avec Alice. Elle crée le document PDF et vous attribuez l'invitation à Bob.
Appareil 2 (ex: un 2ème téléphone, une tablette, ou la version Web dans votre navigateur) : Vous vous connectez avec Bob. Bob voit instantanément la notification / le document dans son onglet "À Signer" et appose sa propre signature depuis son appareil.
Option B : Test sur un seul téléphone (Pratique pour le dev)
Grâce aux correctifs que nous venons de mettre en place :

Vous pouvez tout faire sur le même téléphone en vous déconnectant d'Alice puis en vous connectant avec Bob.
L'application conserve les deux clés privées séparément sur l'appareil (SIGN_IT_PRIVATE_KEY_alice et SIGN_IT_PRIVATE_KEY_bob), ce qui permet de tester l'intégralité du flux sans avoir besoin de 2 smartphones sous la main.
💡 En résumé : Pour un test rapide en dev, 1 seul appareil suffit. Pour faire une démonstration impressionnante de signature distante multi-utilisateurs, utiliser 2 appareils (ou 1 téléphone + 1 navigateur Web) donne un rendu 100% réaliste !
cd backend


# Activer l'environnement virtuel (si pas déjà actif)
# Windows (PowerShell) :
.\venv\Scripts\activate
# Linux / macOS :
source venv/bin/activate
# Installer les dépendances
pip install -r requirements.txt
