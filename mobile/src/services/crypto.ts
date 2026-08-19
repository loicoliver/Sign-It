import forge from 'node-forge';

export interface KeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
}

/**
 * Génère une paire de clés RSA 1024-bit ou 2048-bit au format PEM sur le téléphone.
 * Utilise setTimeout pour ne pas bloquer le thread principal UI.
 */
export async function generateKeyPair(keyBits: number = 1024): Promise<KeyPair> {
  return new Promise((resolve, reject) => {
    // Laisser le temps à React Native d'afficher le spinner / texte de statut
    setTimeout(() => {
      try {
        // Génération synchrone sans Web Worker pour compatibilité React Native (Hermes/JSC)
        const keypair = forge.pki.rsa.generateKeyPair({ bits: keyBits, workers: 0 });
        const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
        const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
        resolve({ publicKeyPem, privateKeyPem });
      } catch (err) {
        console.error("Erreur lors de la génération de clés RSA :", err);
        reject(err);
      }
    }, 100);
  });
}

/**
 * Signe un message (chaine UTF-8 / Hash) avec la clé privée RSA et SHA-256.
 * Retourne la signature au format Base64.
 */
export function signPayload(privateKeyPem: string, message: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(message, 'utf8');
  const signatureBytes = privateKey.sign(md);
  return forge.util.encode64(signatureBytes);
}

/**
 * Calcule le hash SHA-256 hexadécimal d'une chaîne ou d'un contenu.
 */
export function computeSha256Hex(data: string): string {
  const md = forge.md.sha256.create();
  md.update(data, 'utf8');
  return md.digest().toHex();
}
