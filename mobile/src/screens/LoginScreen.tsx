import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { api } from '../services/api';
import { saveAccessToken } from '../services/secureStore';

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
      <View style={styles.card}>
        <Text style={styles.logoTitle}>Sign It ✍️</Text>
        <Text style={styles.subtitle}>Signature électronique sécurisée</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: alice"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>Pas encore de compte ? S'inscrire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#1e293b', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  logoTitle: { fontSize: 32, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 28 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', fontSize: 15 },
  button: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  linkButton: { marginTop: 18, alignItems: 'center' },
  linkText: { color: '#38bdf8', fontSize: 14 }
});
