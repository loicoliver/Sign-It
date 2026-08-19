import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PRIVATE_KEY_STORAGE_KEY = 'SIGN_IT_PRIVATE_KEY_PEM';
const JWT_ACCESS_TOKEN_KEY = 'SIGN_IT_ACCESS_TOKEN';

let memoryPrivateKeyStore: Record<string, string> = {};
let memoryTokenStore: string | null = null;

function getStorageKeyForUser(username?: string): string {
  if (username && username.trim()) {
    return `SIGN_IT_PRIVATE_KEY_${username.trim().toLowerCase()}`;
  }
  return PRIVATE_KEY_STORAGE_KEY;
}

/**
 * Enregistre la clé privée uniquement dans le stockage sécurisé du téléphone.
 * Si un nom d'utilisateur est fourni, la clé est associée spécifiquement à cet utilisateur.
 */
export async function savePrivateKey(privateKeyPem: string, username?: string): Promise<void> {
  const key = getStorageKeyForUser(username);
  memoryPrivateKeyStore[key] = privateKeyPem;
  memoryPrivateKeyStore[PRIVATE_KEY_STORAGE_KEY] = privateKeyPem; // Fallback générique

  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(key, privateKeyPem, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKeyPem);
    } catch (e) {
      console.warn("Échec d'accès au SecureStore native, bascule mémoire local :", e);
    }
  }
}

/**
 * Récupère la clé privée stockée sur l'appareil pour un utilisateur.
 */
export async function getPrivateKey(username?: string): Promise<string | null> {
  const key = getStorageKeyForUser(username);
  if (Platform.OS === 'web') {
    return memoryPrivateKeyStore[key] || memoryPrivateKeyStore[PRIVATE_KEY_STORAGE_KEY] || null;
  }
  try {
    let stored = await SecureStore.getItemAsync(key);
    if (!stored && username) {
      stored = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
    }
    return stored || memoryPrivateKeyStore[key] || memoryPrivateKeyStore[PRIVATE_KEY_STORAGE_KEY] || null;
  } catch (e) {
    return memoryPrivateKeyStore[key] || memoryPrivateKeyStore[PRIVATE_KEY_STORAGE_KEY] || null;
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
    } catch (e) {}
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
    } catch (e) {}
  }
  return memoryTokenStore;
}

/**
 * Réinitialise la session active (Déconnexion).
 * Note : Les clés privées d'utilisateurs restent conservées sur l'appareil.
 */
export async function clearSecureStorage(): Promise<void> {
  memoryTokenStore = null;
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(JWT_ACCESS_TOKEN_KEY);
    } catch (e) {}
  }
}

