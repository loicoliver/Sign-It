import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../services/api';
import { clearSecureStorage } from '../services/secureStore';

export default function HomeScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'created' | 'assigned'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Upload Modal State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfileAndDocs();
  }, [filter]);

  const loadProfileAndDocs = async () => {
    setLoading(true);
    try {
      const userProfile = await api.getProfile();
      setProfile(userProfile);
      const docs = await api.getDocuments(filter);
      setDocuments(docs);
    } catch (err: any) {
      console.warn("Erreur de chargement :", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        if (!docTitle) {
          setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier PDF.');
    }
  };

  const handleUploadSubmit = async () => {
    if (!docTitle || !selectedFile) {
      Alert.alert('Erreur', 'Veuillez saisir un titre et choisir un fichier PDF.');
      return;
    }

    setUploading(true);
    try {
      await api.uploadDocument(docTitle, selectedFile.uri, selectedFile.name, selectedFile.mimeType || 'application/pdf');
      Alert.alert('Succès', 'Document PDF importé avec succès !');
      setUploadModalVisible(false);
      setDocTitle('');
      setSelectedFile(null);
      loadProfileAndDocs();
    } catch (err: any) {
      Alert.alert('Erreur d\'envoi', err.message || 'Impossible d\'envoyer le fichier.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await clearSecureStorage();
    navigation.replace('Login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <View style={[styles.badge, styles.badgeCompleted]}><Text style={styles.badgeText}>✅ Complété</Text></View>;
      case 'IN_PROGRESS':
        return <View style={[styles.badge, styles.badgeInProgress]}><Text style={styles.badgeText}>✍️ En cours</Text></View>;
      default:
        return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeText}>⏳ En attente</Text></View>;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sign It ✍️</Text>
          <Text style={styles.headerUser}>Connecté : {profile?.username || 'Chargement...'}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.debugButton} onPress={() => navigation.navigate('DebugStorage')}>
            <Text style={styles.debugText}>🔍 Debug</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Filter */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.activeTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'created' && styles.activeTab]}
          onPress={() => setFilter('created')}
        >
          <Text style={[styles.tabText, filter === 'created' && styles.activeTabText]}>Mes Créations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'assigned' && styles.activeTab]}
          onPress={() => setFilter('assigned')}
        >
          <Text style={[styles.tabText, filter === 'assigned' && styles.activeTabText]}>À Signer</Text>
        </TouchableOpacity>
      </View>

      {/* Documents List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfileAndDocs(); }} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucun document trouvé.</Text>
              <Text style={styles.emptySubtext}>Cliquez sur "+ Importer un PDF" pour démarrer.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.docCard}
              onPress={() => navigation.navigate('DocumentDetail', { documentId: item.id })}
            >
              <View style={styles.docHeader}>
                <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
                {getStatusBadge(item.status)}
              </View>
              <Text style={styles.docMeta}>Propriétaire : {item.owner_details?.username}</Text>
              <Text style={styles.docHash} numberOfLines={1}>SHA-256 : {item.file_hash}</Text>
              <View style={styles.docFooter}>
                <Text style={styles.docSignaturesCount}>
                  ✍️ {item.signatures?.length || 0} / {item.authorized_signers?.length || 0} signataires
                </Text>
                <Text style={styles.docDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setUploadModalVisible(true)}>
        <Text style={styles.fabText}>+ Importer un PDF</Text>
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importer un document PDF 📄</Text>

            <Text style={styles.label}>Titre du document</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: Contrat de prestation"
              value={docTitle}
              onChangeText={setDocTitle}
            />

            <TouchableOpacity style={styles.filePickerButton} onPress={handlePickDocument}>
              <Text style={styles.filePickerText}>
                {selectedFile ? `📄 ${selectedFile.name}` : "📂 Parcourir et choisir un fichier PDF"}
              </Text>
            </TouchableOpacity>

            {uploading ? (
              <ActivityIndicator size="large" color="#38bdf8" style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setUploadModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUploadSubmit}>
                  <Text style={styles.confirmButtonText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#1e293b' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#38bdf8' },
  headerUser: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  debugButton: { backgroundColor: '#0ea5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  debugText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  logoutButton: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#f8fafc', fontSize: 12 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 8, borderBottomWidth: 1, borderColor: '#1e293b' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#1e293b' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#38bdf8' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16, paddingBottom: 80 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#cbd5e1', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#64748b', fontSize: 13, marginTop: 6 },
  docCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#38bdf8' },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', flex: 1, marginRight: 8 },
  docMeta: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  docHash: { fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 2 },
  docFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: '#334155' },
  docSignaturesCount: { fontSize: 12, color: '#38bdf8', fontWeight: '600' },
  docDate: { fontSize: 11, color: '#64748b' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeCompleted: { backgroundColor: '#166534' },
  badgeInProgress: { backgroundColor: '#075985' },
  badgePending: { backgroundColor: '#854d0e' },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#0284c7', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6 },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  filePickerButton: { backgroundColor: '#0f172a', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#0284c7', borderStyle: 'dashed', alignItems: 'center', marginBottom: 20 },
  filePickerText: { color: '#38bdf8', fontSize: 13 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#334155', marginRight: 8 },
  cancelButtonText: { color: '#cbd5e1', fontWeight: '600' },
  confirmButton: { backgroundColor: '#0284c7', marginLeft: 8 },
  confirmButtonText: { color: '#ffffff', fontWeight: 'bold' }
});
