import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

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
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' },
  lockIcon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, gap: 16 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#38bdf8' },
  dotEmpty: { backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#38bdf8' },
  errorText: { color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  keyboard: { marginTop: 12, width: '100%' },
  keyboardRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  keyText: { fontSize: 24, fontWeight: '600', color: '#f8fafc' },
  keyDelete: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center' },
  keyDeleteText: { fontSize: 22, color: '#38bdf8' },
  keyPlaceholder: { width: 72, height: 72 },
  cancelButton: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 32 },
  cancelText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
});
