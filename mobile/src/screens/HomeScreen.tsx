import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../services/api';
import { clearSecureStorage } from '../services/secureStore';
import { theme } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'created' | 'assigned'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        return <View style={[styles.badge, styles.badgeCompleted]}><Text style={styles.badgeText}>Complété</Text></View>;
      case 'IN_PROGRESS':
        return <View style={[styles.badge, styles.badgeInProgress]}><Text style={styles.badgeText}>En cours</Text></View>;
      default:
        return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeText}>En attente</Text></View>;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sign It</Text>
          <Text style={styles.headerUser}>{profile?.username || 'Chargement...'}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.debugButton} onPress={() => navigation.navigate('DebugStorage')}>
            <Text style={styles.debugText}>Debug</Text>
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
          <Text style={[styles.tabText, filter === 'created' && styles.activeTabText]}>Mes créations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'assigned' && styles.activeTab]}
          onPress={() => setFilter('assigned')}
        >
          <Text style={[styles.tabText, filter === 'assigned' && styles.activeTabText]}>À signer</Text>
        </TouchableOpacity>
      </View>

      {/* Documents List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.black} />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { setRefreshing(true); loadProfileAndDocs(); }}
              tintColor={theme.colors.black}
            />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>Aucun document</Text>
              <Text style={styles.emptySubtext}>Importez votre premier PDF pour commencer</Text>
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
              <Text style={styles.docMeta}>Par {item.owner_details?.username}</Text>
              <Text style={styles.docHash} numberOfLines={1}>{item.file_hash.substring(0, 16)}...</Text>
              <View style={styles.docFooter}>
                <Text style={styles.docSignaturesCount}>
                  {item.signatures?.length || 0} / {item.authorized_signers?.length || 0} signatures
                </Text>
                <Text style={styles.docDate}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setUploadModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importer un document</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre du document</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez un titre"
                placeholderTextColor={theme.colors.gray400}
                value={docTitle}
                onChangeText={setDocTitle}
              />
            </View>

            <TouchableOpacity style={styles.filePickerButton} onPress={handlePickDocument}>
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : "Choisir un fichier PDF"}
              </Text>
            </TouchableOpacity>

            {uploading ? (
              <ActivityIndicator size="large" color={theme.colors.black} style={{ marginVertical: theme.spacing.lg }} />
            ) : (
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => {
                    setUploadModalVisible(false);
                    setDocTitle('');
                    setSelectedFile(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUploadSubmit}>
                  <Text style={styles.confirmButtonText}>Importer</Text>
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
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background,
  },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { 
    ...theme.typography.h2,
  },
  headerUser: { 
    ...theme.typography.small,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  debugButton: { 
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugText: { 
    ...theme.typography.bodyMedium,
    fontSize: 12,
  },
  logoutButton: { 
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoutText: { 
    ...theme.typography.bodyMedium,
    fontSize: 14,
  },
  tabsRow: { 
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: { 
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 4,
  },
  activeTab: { 
    backgroundColor: theme.colors.black,
  },
  tabText: { 
    ...theme.typography.bodyMedium,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  activeTabText: { 
    color: theme.colors.white,
  },
  centerLoading: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: { 
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  emptyState: { 
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
    opacity: 0.3,
    display: 'none',
  },
  emptyText: { 
    ...theme.typography.h4,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: { 
    ...theme.typography.small,
    textAlign: 'center',
  },
  docCard: { 
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  docHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  docTitle: { 
    ...theme.typography.h4,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  docMeta: { 
    ...theme.typography.small,
    marginBottom: 4,
  },
  docHash: { 
    ...theme.typography.caption,
    fontFamily: 'monospace',
  },
  docFooter: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  docSignaturesCount: { 
    ...theme.typography.bodyMedium,
    fontSize: 13,
  },
  docDate: { 
    ...theme.typography.caption,
  },
  badge: { 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  badgeCompleted: { 
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.black,
  },
  badgeInProgress: { 
    backgroundColor: theme.colors.gray900,
    borderColor: theme.colors.black,
  },
  badgePending: { 
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.gray300,
  },
  badgeText: { 
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.black,
  },
  fab: { 
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    width: 60,
    height: 60,
    backgroundColor: theme.colors.black,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  fabIcon: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: '300',
  },
  modalOverlay: { 
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: { 
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 440,
  },
  modalTitle: { 
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
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
  filePickerButton: { 
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  filePickerText: { 
    ...theme.typography.bodyMedium,
  },
  modalButtonsRow: { 
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: { 
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: { 
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: { 
    ...theme.typography.bodyMedium,
  },
  confirmButton: { 
    backgroundColor: theme.colors.black,
  },
  confirmButtonText: { 
    ...theme.typography.bodyMedium,
    color: theme.colors.white,
  },
});
