import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { theme } from '../theme';

interface PinModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
  isSetup?: boolean;
  errorMessage?: string;
}

const PIN_LENGTH = 4;

/**
 * Modal de saisie de code PIN à 4 chiffres avec clavier numérique.
 * Modes:
 *  - isSetup=true : création du PIN (double saisie pour confirmation)
 *  - isSetup=false : vérification du PIN (saisie simple)
 */
export default function PinModal({
  visible,
  title = 'Entrez votre code PIN',
  subtitle,
  onConfirm,
  onCancel,
  isSetup = false,
  errorMessage,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [localError, setLocalError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setStep('enter');
      setLocalError('');
    }
  }, [visible]);

  useEffect(() => {
    if (errorMessage) {
      triggerShake();
      setPin('');
    }
  }, [errorMessage]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length >= PIN_LENGTH) return;
    const newPin = currentPin + digit;
    setCurrentPin(newPin);
    setLocalError('');

    if (newPin.length === PIN_LENGTH) {
      handlePinComplete(newPin);
    }
  };

  const handleDelete = () => {
    if (currentPin.length === 0) return;
    setCurrentPin(currentPin.slice(0, -1));
    setLocalError('');
  };

  const handlePinComplete = (completedPin: string) => {
    if (isSetup) {
      if (step === 'enter') {
        setTimeout(() => setStep('confirm'), 150);
      } else {
        if (completedPin !== pin) {
          setLocalError('Les codes PIN ne correspondent pas. Réessayez.');
          triggerShake();
          setTimeout(() => {
            setPin('');
            setConfirmPin('');
            setStep('enter');
          }, 800);
        } else {
          onConfirm(completedPin);
        }
      }
    } else {
      onConfirm(completedPin);
    }
  };

  const displayError = localError || errorMessage || '';
  const currentTitle = isSetup
    ? step === 'enter'
      ? 'Créer votre code PIN'
      : 'Confirmez votre code PIN'
    : title;

  const currentSubtitle = isSetup
    ? step === 'enter'
      ? 'Choisissez un code PIN à 4 chiffres pour sécuriser vos signatures.'
      : 'Resaisissez votre code PIN pour confirmer.'
    : subtitle;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={styles.title}>{currentTitle}</Text>
          {currentSubtitle ? <Text style={styles.subtitle}>{currentSubtitle}</Text> : null}

          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < currentPin.length ? styles.dotFilled : styles.dotEmpty]}
              />
            ))}
          </Animated.View>

          {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

          <View style={styles.keyboard}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', '⌫'],
            ].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keyboardRow}>
                {row.map((key, keyIndex) => {
                  if (key === '') {
                    return <View key={keyIndex} style={styles.keyPlaceholder} />;
                  }
                  if (key === '⌫') {
                    return (
                      <TouchableOpacity
                        key={keyIndex}
                        style={styles.keyDelete}
                        onPress={handleDelete}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.keyDeleteText}>⌫</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={keyIndex}
                      style={styles.key}
                      onPress={() => handleDigit(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keyText}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: theme.spacing.lg 
  },
  card: { 
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl, 
    padding: 32, 
    width: '100%', 
    maxWidth: 360, 
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  lockIcon: { 
    fontSize: 48, 
    marginBottom: theme.spacing.md,
    display: 'none',
  },
  title: { 
    ...theme.typography.h3,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: { 
    ...theme.typography.small,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
    paddingHorizontal: theme.spacing.sm,
  },
  dotsRow: { 
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  dot: { 
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.black,
  },
  dotEmpty: { 
    backgroundColor: 'transparent',
  },
  dotFilled: { 
    backgroundColor: theme.colors.black,
  },
  errorText: { 
    ...theme.typography.small,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  keyboard: { 
    marginTop: theme.spacing.sm,
    width: '100%',
  },
  keyboardRow: { 
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  key: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.border, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  keyText: { 
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.black,
  },
  keyDelete: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.border, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  keyDeleteText: { 
    fontSize: 26,
    color: theme.colors.black,
  },
  keyPlaceholder: { 
    width: 70,
    height: 70,
  },
  cancelButton: { 
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  cancelText: { 
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
});
