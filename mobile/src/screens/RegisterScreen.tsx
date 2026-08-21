import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { api } from '../services/api';
import { generateKeyPair } from '../services/crypto';
import { savePrivateKey, saveAccessToken } from '../services/secureStore';
import { savePinForUser } from '../services/pinService';
import { getAuthenticationMessage } from '../services/biometricsAuth';
import PinModal from '../components/PinModal';
import { theme } from '../theme';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  
  const [pinModalVisible, setPinModalVisible] = useState(false);

  useEffect(() => {
    loadAuthMessage();
  }, []);

  const loadAuthMessage = async () => {
    const message = await getAuthenticationMessage();
    setAuthMessage(message);
  };

  const handleRegister = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner un nom d\'utilisateur et un mot de passe.');
      return;
    }
    setPinModalVisible(true);
  };

  const handlePinConfirmed = async (pin: string) => {
    setPinModalVisible(false);
    setLoading(true);

    try {
      setStatusText('🔒 Sauvegarde du code PIN...');
      await savePinForUser(username.trim(), pin);

      setStatusText('🔑 Génération de votre paire de clés...');
      const keypair = await generateKeyPair(1024);

      setStatusText('💾 Sauvegarde de la clé privée...');
      await savePrivateKey(keypair.privateKeyPem, username.trim());

      setStatusText('🌐 Création du compte...');
      await api.register(username.trim(), email.trim(), password, keypair.publicKeyPem);

      setStatusText('⚡ Connexion...');
      const loginData = await api.login(username.trim(), password);
      await saveAccessToken(loginData.access);

      Alert.alert(
        'Inscription réussie',
        'Votre compte est créé. Votre clé privée et votre code PIN sont sécurisés.',
        [{ text: 'Continuer', onPress: () => navigation.replace('Home') }]
      );
    } catch (err: any) {
      Alert.alert('Échec de l\'inscription', err.message || 'Impossible de se connecter au serveur.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Génération de votre identité cryptographique</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <TextInput
              style={styles.input}
              placeholder="Entrez votre nom d'utilisateur"
              placeholderTextColor={theme.colors.gray400}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse Email (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={theme.colors.gray400}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="Entrez votre mot de passe"
              placeholderTextColor={theme.colors.gray400}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{authMessage}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.colors.black} />
              <Text style={styles.loadingText}>{statusText}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Définir mon PIN & S'inscrire</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Déjà un compte ? <Text style={styles.linkTextBold}>Se connecter</Text></Text>
          </TouchableOpacity>
        </View>
      </View>

      <PinModal
        visible={pinModalVisible}
        isSetup
        onConfirm={handlePinConfirmed}
        onCancel={() => setPinModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1, 
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.xxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    fontSize: 56,
    marginBottom: theme.spacing.sm,
    display: 'none',
  },
  title: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.small,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.sm,
  },
  inputGroup: { 
    marginBottom: theme.spacing.md,
  },
  label: { 
    ...theme.typography.bodyMedium,
    marginBottom: theme.spacing.sm,
  },
  input: { 
    backgroundColor: theme.colors.white,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    fontSize: 16,
  },
  infoBox: { 
    backgroundColor: theme.colors.gray100,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.md,
  },
  infoText: { 
    ...theme.typography.small,
    lineHeight: 20,
  },
  loadingBox: { 
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  loadingText: { 
    ...theme.typography.body,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  button: { 
    backgroundColor: theme.colors.black,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  buttonText: { 
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  linkButton: { 
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  linkText: { 
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  linkTextBold: {
    fontWeight: '600',
    color: theme.colors.black,
  },
});
