import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { api } from '../services/api';
import { saveAccessToken } from '../services/secureStore';
import { theme } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez saisir votre nom d\'utilisateur et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(username, password);
      await saveAccessToken(data.access);
      navigation.replace('Home');
    } catch (err: any) {
      Alert.alert('Échec de connexion', err.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>✍️</Text>
          <Text style={styles.title}>Sign It</Text>
          <Text style={styles.subtitle}>Signature électronique sécurisée</Text>
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

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Pas encore de compte ? <Text style={styles.linkTextBold}>S'inscrire</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background,
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
    marginBottom: theme.spacing.xxl,
  },
  logo: {
    fontSize: 64,
    marginBottom: theme.spacing.sm,
    display: 'none',
  },
  title: {
    ...theme.typography.h1,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.small,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.md,
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
