import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { verifyPinForUser } from './pinService';

export interface BiometricAuthResult {
  success: boolean;
  method: 'face' | 'fingerprint' | 'pin' | 'none';
  message: string;
}

/**
 * Vérifie si le téléphone supporte la biométrie (Face ID ou Empreinte)
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Détecte quel type de biométrie est disponible sur l'appareil
 */
export async function getBiometricType(): Promise<'face' | 'fingerprint' | 'none'> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    // FACIAL_RECOGNITION = 1, FINGERPRINT = 2, IRIS = 3
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Authentifie l'utilisateur de manière adaptative :
 * 1. Essaie Face ID/Empreinte si disponible
 * 2. Sinon, utilise le code PIN comme fallback
 */
export async function authenticateUser(
  username: string,
  options?: {
    promptMessage?: string;
    fallbackLabel?: string;
    disablePinFallback?: boolean;
  }
): Promise<BiometricAuthResult> {
  const {
    promptMessage = 'Authentifiez-vous pour continuer',
    fallbackLabel = 'Utiliser le code PIN',
    disablePinFallback = false,
  } = options || {};

  // 1. Vérifier si biométrie disponible
  const biometricAvailable = await isBiometricAvailable();
  
  if (biometricAvailable) {
    try {
      const biometricType = await getBiometricType();
      const biometricLabel = biometricType === 'face' 
        ? 'Face ID' 
        : biometricType === 'fingerprint' 
        ? 'Empreinte digitale' 
        : 'Biométrie';

      // 2. Tenter authentification biométrique
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: disablePinFallback ? undefined : fallbackLabel,
        disableDeviceFallback: false,
        cancelLabel: 'Annuler',
      });

      if (result.success) {
        return {
          success: true,
          method: biometricType,
          message: `Authentifié avec ${biometricLabel}`,
        };
      } else {
        // Utilisateur a annulé ou échec biométrique
        return {
          success: false,
          method: biometricType,
          message: 'Authentification biométrique annulée ou échouée',
        };
      }
    } catch (error: any) {
      console.warn('[BiometricsAuth] Erreur biométrique:', error);
      // Continue vers le fallback PIN si pas désactivé
    }
  }

  // 3. Fallback : Retourner un indicateur que le PIN doit être demandé
  if (disablePinFallback) {
    return {
      success: false,
      method: 'none',
      message: 'Aucune méthode d\'authentification disponible',
    };
  }

  // Le PIN sera demandé par l'appelant via PinModal
  return {
    success: false,
    method: 'pin',
    message: 'Code PIN requis',
  };
}

/**
 * Vérifie le PIN de l'utilisateur (utilisé comme fallback)
 */
export async function verifyPin(username: string, pin: string): Promise<boolean> {
  return await verifyPinForUser(username, pin);
}

/**
 * Retourne un message d'information sur la méthode d'authentification disponible
 */
export async function getAuthenticationMessage(): Promise<string> {
  const available = await isBiometricAvailable();
  
  if (!available) {
    return '🔢 Vous utiliserez un code PIN à 4 chiffres pour sécuriser vos signatures.';
  }

  const type = await getBiometricType();
  
  if (type === 'face') {
    return '😊 Face ID détecté ! Vous pourrez utiliser votre visage pour signer les documents (avec code PIN en secours).';
  }
  
  if (type === 'fingerprint') {
    return '👆 Empreinte digitale détectée ! Vous pourrez utiliser votre empreinte pour signer les documents (avec code PIN en secours).';
  }
  
  return '🔢 Vous utiliserez un code PIN à 4 chiffres pour sécuriser vos signatures.';
}

/**
 * Pour les plateformes web où la biométrie n'est pas supportée
 */
export function isBiometricSupportedOnPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
