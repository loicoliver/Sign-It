import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export default function DebugStorageScreen({ navigation }: any) {
  const [storageData, setStorageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const scanStorage = async () => {
    setLoading(true);
    const data: any[] = [];

    // Liste des clés possibles à tester
    const possibleKeys = [
      'SIGN_IT_PRIVATE_KEY_alice',
      'SIGN_IT_PRIVATE_KEY_bob',
      'SIGN_IT_PRIVATE_KEY_loic',
      'SIGN_IT_PRIVATE_KEY_evan',
      'SIGN_IT_PIN_alice',
      'SIGN_IT_PIN_bob',
      'SIGN_IT_PIN_loic',
      'SIGN_IT_PIN_evan',
      'SIGN_IT_ACCESS_TOKEN',
    ];

    for (const key of possibleKeys) {
      try {
        if (Platform.OS !== 'web') {
          const value = await SecureStore.getItemAsync(key);
          if (value) {
            // Pour les clés privées, n'afficher que les premiers caractères
            const isPrivateKey = key.includes('PRIVATE_KEY');
            const displayValue = isPrivateKey
              ? value.substring(0, 80) + '...'
              : value;

            data.push({
              key,
              value: displayValue,
              length: value.length,
              type: isPrivateKey ? '🔐 Clé Privée' : key.includes('PIN') ? '🔢 Code PIN' : '🎫 Token',
            });
          }
        }
      } catch (e) {
        // Clé n'existe pas ou erreur d'accès
      }
    }

    setStorageData(data);
    setLoading(false);

    if (data.length === 0) {
      Alert.alert('Aucune donnée', 'Aucune clé trouvée dans le SecureStore.');
    }
  };

  const clearAllStorage = () => {
    Alert.alert(
      '⚠️ Attention',
      'Voulez-vous vraiment SUPPRIMER toutes les données sécurisées ? Vous devrez vous réinscrire.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            for (const item of storageData) {
              try {
                await SecureStore.deleteItemAsync(item.key);
              } catch (e) {}
            }
            Alert.alert('✅ Nettoyage terminé', 'Toutes les données ont été supprimées.');
            setStorageData([]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🔍 Debug SecureStore</Text>
      <Text style={styles.subtitle}>Visualisation des clés stockées sur cet appareil</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={scanStorage}
          disabled={loading}
        >
          <Text style={styles.scanButtonText}>
            {loading ? 'Scan en cours...' : '🔍 Scanner le stockage'}
          </Text>
        </TouchableOpacity>

        {storageData.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAllStorage}>
            <Text style={styles.clearButtonText}>🗑️ Tout nettoyer</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.resultsList}>
        {storageData.map((item, index) => (
          <View key={index} style={styles.storageItem}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemType}>{item.type}</Text>
              <Text style={styles.itemLength}>{item.length} caractères</Text>
            </View>
            <Text style={styles.itemKey}>{item.key}</Text>
            <View style={styles.itemValueBox}>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          </View>
        ))}

        {storageData.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              👆 Appuyez sur "Scanner le stockage" pour voir les clés enregistrées
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ Les clés privées et codes PIN sont stockés séparément pour chaque utilisateur
          dans le SecureStore sécurisé de l'appareil (Android Keystore / iOS Keychain).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 50 },
  backButton: { marginBottom: 14 },
  backText: { color: '#38bdf8', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  scanButton: { flex: 1, backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  scanButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  clearButton: { backgroundColor: '#dc2626', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  clearButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  resultsList: { flex: 1, marginBottom: 16 },
  storageItem: { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#38bdf8' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemType: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  itemLength: { color: '#64748b', fontSize: 12 },
  itemKey: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', marginBottom: 8 },
  itemValueBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 6 },
  itemValue: { color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  infoBox: { backgroundColor: '#1e293b', padding: 14, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#0ea5e9' },
  infoText: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
});
