import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PRIVATE_KEY_STORAGE_KEY = 'SIGN_IT_PRIVATE_KEY_PEM';
const JWT_ACCESS_TOKEN_KEY = 'SIGN_IT_ACCESS_TOKEN';

let memoryPrivateKeyStore: string | null = null;
let memoryTokenStore: string | null = null;

/**
 * Enregistre la clé privée uniquement dans le stockage sécurisé du téléphone.
 */
export async function savePrivateKey(privateKeyPem: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryPrivateKeyStore = privateKeyPem;
    return;
  }
  try {
    await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKeyPem, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch (e) {
    console.warn("Échec d'accès au SecureStore native, bascule mémoire local :", e);
    memoryPrivateKeyStore = privateKeyPem;
  }
}

/**
 * Récupère la clé privée stockée sur l'appareil.
 */
export async function getPrivateKey(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memoryPrivateKeyStore;
  }
  try {
    const key = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
    return key || memoryPrivateKeyStore;
  } catch (e) {
    return memoryPrivateKeyStore;
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
 * Réinitialise le stockage (Déconnexion).
 */
export async function clearSecureStorage(): Promise<void> {
  memoryPrivateKeyStore = null;
  memoryTokenStore = null;
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(JWT_ACCESS_TOKEN_KEY);
    } catch (e) {}
  }
}
