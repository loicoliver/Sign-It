import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { api } from '../services/api';
import { generateKeyPair } from '../services/crypto';
import { savePrivateKey, saveAccessToken } from '../services/secureStore';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner un nom d\'utilisateur et un mot de passe.');
      return;
    }

    setLoading(true);
    try {
      setStatusText('🔑 Génération de votre paire de clés (RSA)...');
      console.log("[Register] Début génération de clés...");
      const keypair = await generateKeyPair(1024);
      console.log("[Register] Clés générées avec succès !");

      setStatusText('🔒 Sauvegarde de la clé privée sur le téléphone...');
      await savePrivateKey(keypair.privateKeyPem);

      setStatusText('🌐 Envoi de la clé publique au serveur...');
      console.log("[Register] Envoi de la clé publique au serveur backend...");
      await api.register(username.trim(), email.trim(), password, keypair.publicKeyPem);

      setStatusText('⚡ Connexion automatique...');
      const loginData = await api.login(username.trim(), password);
      await saveAccessToken(loginData.access);

      Alert.alert(
        'Inscription réussie ! 🔑',
        'Votre compte a été créé. La clé privée est conservée en sécurité sur votre téléphone.',
        [{ text: 'Continuer', onPress: () => navigation.replace('Home') }]
      );
    } catch (err: any) {
      console.error("[Register Error]", err);
      Alert.alert('Échec de l\'inscription', err.message || 'Impossible de se connecter au serveur backend.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Créer un compte Sign It 🔐</Text>
        <Text style={styles.subtitle}>Génération de votre identité cryptographique</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: bob"
            placeholderTextColor="#64748b"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse Email (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="bob@example.com"
            placeholderTextColor="#64748b"
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
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🛡️ Lors de l'inscription, votre téléphone génère une paire de clés cryptographiques. Votre clé privée restera strictement confidentielle sur cet appareil.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>{statusText}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Générer mes clés & S'inscrire</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Déjà un compte ? Se connecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#1e293b', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', fontSize: 15 },
  infoBox: { backgroundColor: '#0284c715', borderColor: '#0284c740', borderWidth: 1, padding: 12, borderRadius: 8, marginVertical: 12 },
  infoText: { color: '#38bdf8', fontSize: 12, lineHeight: 18 },
  loadingBox: { alignItems: 'center', marginVertical: 16 },
  loadingText: { color: '#38bdf8', fontSize: 13, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  button: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#38bdf8', fontSize: 14 }
});
