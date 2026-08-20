import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Préfixe pour les clés de PIN dans SecureStore
const PIN_KEY_PREFIX = 'SIGN_IT_PIN_';

// Mémoire de secours pour les tests Web (pas de SecureStore natif)
const memoryPinStore: Record<string, string> = {};

/**
 * Retourne la clé SecureStore pour le PIN d'un utilisateur donné.
 * Les clés SecureStore n'acceptent que alphanum + . - _
 */
function getPinKey(username: string): string {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  return `${PIN_KEY_PREFIX}${safe}`;
}

/**
 * Enregistre le PIN d'un utilisateur dans SecureStore.
 * Le PIN est stocké en clair (il sert uniquement à débloquer la clé privée locale).
 */
export async function savePinForUser(username: string, pin: string): Promise<void> {
  const key = getPinKey(username);
  memoryPinStore[key] = pin;

  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(key, pin, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  }
}

/**
 * Vérifie si le PIN saisi par l'utilisateur correspond au PIN enregistré.
 */
export async function verifyPinForUser(username: string, pinAttempt: string): Promise<boolean> {
  const key = getPinKey(username);

  let storedPin: string | null = null;

  if (Platform.OS !== 'web') {
    try {
      storedPin = await SecureStore.getItemAsync(key);
    } catch {
      storedPin = memoryPinStore[key] ?? null;
    }
  } else {
    storedPin = memoryPinStore[key] ?? null;
  }

  if (!storedPin) return false;
  return storedPin === pinAttempt;
}

/**
 * Vérifie si un PIN a déjà été configuré pour cet utilisateur sur cet appareil.
 */
export async function hasPinConfigured(username: string): Promise<boolean> {
  const key = getPinKey(username);

  if (Platform.OS !== 'web') {
    try {
      const val = await SecureStore.getItemAsync(key);
      return val !== null;
    } catch {
      return key in memoryPinStore;
    }
  }
  return key in memoryPinStore;
}

/**
 * Supprime le PIN d'un utilisateur (ex: réinitialisation).
 */
export async function deletePinForUser(username: string): Promise<void> {
  const key = getPinKey(username);
  delete memoryPinStore[key];

  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silencieux si la clé n'existe pas
    }
  }
}
