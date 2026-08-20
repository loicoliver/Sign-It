import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const JWT_ACCESS_TOKEN_KEY = 'SIGN_IT_ACCESS_TOKEN';
const PRIVATE_KEY_PREFIX = 'SIGN_IT_PRIVATE_KEY_';

// Mémoire de secours pour les environnements Web
const memoryPrivateKeyStore: Record<string, string> = {};
let memoryTokenStore: string | null = null;

/**
 * Retourne la clé SecureStore pour la clé privée d'un utilisateur.
 * Chaque utilisateur a sa propre clé isolée.
 */
function getPrivateKeyStorageKey(username: string): string {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  return `${PRIVATE_KEY_PREFIX}${safe}`;
}

/**
 * Enregistre la clé privée dans SecureStore, isolée par utilisateur.
 */
export async function savePrivateKey(privateKeyPem: string, username: string): Promise<void> {
  const key = getPrivateKeyStorageKey(username);
  memoryPrivateKeyStore[key] = privateKeyPem;

  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(key, privateKeyPem, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    } catch (e) {
      console.warn(`[SecureStore] Impossible de sauvegarder la clé privée pour "${username}":`, e);
    }
  }
}

/**
 * Récupère la clé privée stockée pour un utilisateur spécifique.
 * Retourne null si aucune clé n'est trouvée.
 */
export async function getPrivateKey(username: string): Promise<string | null> {
  const key = getPrivateKeyStorageKey(username);

  if (Platform.OS === 'web') {
    return memoryPrivateKeyStore[key] ?? null;
  }

  try {
    const stored = await SecureStore.getItemAsync(key);
    if (stored) return stored;
  } catch (e) {
    console.warn(`[SecureStore] Impossible de lire la clé privée pour "${username}":`, e);
  }

  return memoryPrivateKeyStore[key] ?? null;
}

/**
 * Vérifie si une clé privée existe pour cet utilisateur.
 */
export async function hasPrivateKey(username: string): Promise<boolean> {
  const key = await getPrivateKey(username);
  return key !== null;
}

/**
 * Supprime la clé privée d'un utilisateur.
 */
export async function deletePrivateKey(username: string): Promise<void> {
  const key = getPrivateKeyStorageKey(username);
  delete memoryPrivateKeyStore[key];

  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silencieux
    }
  }
}

/**
 * Enregistre le Token JWT d'accès.
 */
export async function saveAccessToken(token: string): Promise<void> {
  memoryTokenStore = token;
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(JWT_ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.warn('[SecureStore] Impossible de sauvegarder le token JWT :', e);
    }
  }
}

/**
 * Récupère le Token JWT.
 */
export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const t = await SecureStore.getItemAsync(JWT_ACCESS_TOKEN_KEY);
      if (t) return t;
    } catch (e) {
      console.warn('[SecureStore] Impossible de lire le token JWT :', e);
    }
  }
  return memoryTokenStore;
}

/**
 * Réinitialise la session active (Déconnexion).
 * Les clés privées et PINs des utilisateurs restent conservés sur l'appareil.
 */
export async function clearSecureStorage(): Promise<void> {
  memoryTokenStore = null;
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(JWT_ACCESS_TOKEN_KEY);
    } catch {
      // Silencieux
    }
  }
}
