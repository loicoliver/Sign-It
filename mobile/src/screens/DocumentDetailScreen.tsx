import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { api } from '../services/api';
import { getPrivateKey, savePrivateKey } from '../services/secureStore';
import { signPayload, generateKeyPair, computeSha256Hex } from '../services/crypto';
import { authenticateUser } from '../services/biometricsAuth';
import { verifyPinForUser } from '../services/pinService';
import PinModal from '../components/PinModal';
import { theme } from '../theme';

export default function DocumentDetailScreen({ route, navigation }: any) {
  const { documentId } = route.params;

  const [document, setDocument] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [usersModalVisible, setUsersModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');

  const [signing, setSigning] = useState(false);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const userProfile = await api.getProfile();
      setProfile(userProfile);
      const doc = await api.getDocumentDetail(documentId);
      setDocument(doc);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger les détails.');
    } finally {
      setLoading(false);
    }
  };

  const openAddSignerModal = async () => {
    try {
      const users = await api.getUsers();
      const existingIds = document.authorized_signers?.map((s: any) => s.user) || [];
      const available = users.filter((u: any) => !existingIds.includes(u.id));
      setAllUsers(available);
      setUsersModalVisible(true);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de charger la liste des utilisateurs.');
    }
  };

  const handleAuthorizeUser = async (userId: number, username: string) => {
    try {
      await api.authorizeSigner(documentId, userId);
      Alert.alert('Succès', `${username} ajouté comme signataire autorisé.`);
      setUsersModalVisible(false);
      loadDetails();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec de l\'ajout du signataire.');
    }
  };

  const handleSignDocument = async () => {
    const username = profile?.username;
    if (!username) return;

    setSigning(true);

    try {
      const authResult = await authenticateUser(username, {
        promptMessage: 'Authentifiez-vous pour signer le document',
        fallbackLabel: 'Utiliser le code PIN',
      });

      if (authResult.success) {
        await proceedWithSigning(username);
        return;
      }

      if (authResult.method !== 'pin') {
        Alert.alert('Authentification annulée', authResult.message);
        setSigning(false);
        return;
      }

      setPinError('');
      setPinModalVisible(true);
      setSigning(false);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible d\'authentifier. Veuillez réessayer.');
      setSigning(false);
    }
  };

  const handlePinConfirm = async (enteredPin: string) => {
    const username = profile?.username;
    if (!username) return;

    const isValid = await verifyPinForUser(username, enteredPin);
    if (!isValid) {
      setPinError('Code PIN incorrect. Réessayez.');
      return;
    }

    setPinModalVisible(false);
    setPinError('');
    setSigning(true);

    await proceedWithSigning(username);
  };

  const proceedWithSigning = async (username: string) => {
    try {
      let privateKeyPem = await getPrivateKey(username);

      if (!privateKeyPem) {
        Alert.alert(
          'Clé privée introuvable',
          `Aucune clé privée pour "${username}".\n\nGénérer une nouvelle paire de clés ?`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => setSigning(false) },
            {
              text: 'Générer',
              onPress: async () => {
                try {
                  const keypair = await generateKeyPair(1024);
                  await savePrivateKey(keypair.privateKeyPem, username);
                  await api.updatePublicKey(keypair.publicKeyPem);
                  Alert.alert('Succès', 'Nouvelle paire de clés générée.');
                  executeSigningProcess(keypair.privateKeyPem);
                } catch (e: any) {
                  Alert.alert('Erreur', e.message || 'Échec de génération de clés.');
                  setSigning(false);
                }
              }
            }
          ]
        );
        return;
      }

      await executeSigningProcess(privateKeyPem);
    } catch (err: any) {
      Alert.alert('Échec de la signature', err.message || 'Une erreur est survenue.');
      setSigning(false);
    }
  };

  const executeSigningProcess = async (privateKeyPem: string) => {
    try {
      const lastSignature = document.signatures?.[document.signatures.length - 1];
      let payloadToSign: string;
      
      if (lastSignature) {
        payloadToSign = `${document.file_hash}:${lastSignature.signature_value}`;
      } else {
        payloadToSign = document.file_hash;
      }

      const payloadHash = computeSha256Hex(payloadToSign);
      const signatureBase64 = signPayload(privateKeyPem, payloadHash);

      await api.signDocument(documentId, signatureBase64);

      Alert.alert('Signature validée', 'Votre signature a été enregistrée.');
      loadDetails();
    } catch (err: any) {
      Alert.alert('Échec', err.message || 'Une erreur est survenue.');
    } finally {
      setSigning(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    setVerifyModalVisible(true);
    try {
      const res = await api.verifyDocument(documentId);
      setVerifyResult(res);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec de la vérification.');
      setVerifyModalVisible(false);
    } finally {
      setVerifying(false);
    }
  };

  if (loading || !document) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={theme.colors.black} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const isOwner = document.owner === profile?.id;
  const isAuthorizedToSign = document.authorized_signers?.some((s: any) => s.user === profile?.id);
  const hasAlreadySigned = document.signatures?.some((s: any) => s.signer === profile?.id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <View style={styles.headerSection}>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.ownerText}>Créé par {document.owner_details?.username}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{document.status}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Empreinte du document</Text>
        <Text style={styles.hashText}>{document.file_hash}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>Signataires autorisés</Text>
          {isOwner && (
            <TouchableOpacity style={styles.addButton} onPress={openAddSignerModal}>
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>

        {document.authorized_signers?.length > 0 ? (
          document.authorized_signers.map((signer: any) => {
            const sig = document.signatures?.find((s: any) => s.signer === signer.user);
            return (
              <View key={signer.id} style={styles.signerItem}>
                <Text style={styles.signerName}>{signer.user_details?.username}</Text>
                {sig ? (
                  <View style={styles.signedBadge}>
                    <Text style={styles.signedText}>Signé</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>En attente</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>Aucun signataire autorisé</Text>
        )}
      </View>

      <View style={styles.actionsBox}>
        {isAuthorizedToSign && !hasAlreadySigned && (
          <TouchableOpacity style={styles.signButton} onPress={handleSignDocument} disabled={signing}>
            {signing ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.signButtonText}>Signer le document</Text>
            )}
          </TouchableOpacity>
        )}

        {hasAlreadySigned && (
          <View style={styles.alreadySignedBox}>
            <Text style={styles.alreadySignedText}>Vous avez déjà signé ce document</Text>
          </View>
        )}

        <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyChain}>
          <Text style={styles.verifyButtonText}>Vérifier la chaîne</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Journal d'audit</Text>
        {document.audit_logs?.length > 0 ? (
          document.audit_logs.map((log: any) => (
            <View key={log.id} style={styles.logItem}>
              <Text style={styles.logAction}>{log.action}</Text>
              <Text style={styles.logDetails}>{log.details}</Text>
              <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString('fr-FR')}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune entrée</Text>
        )}
      </View>

      {/* Add Signer Modal */}
      <Modal visible={usersModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajouter un signataire</Text>
            {allUsers.length === 0 ? (
              <Text style={styles.emptyText}>Tous les utilisateurs sont déjà autorisés</Text>
            ) : (
              <FlatList
                data={allUsers}
                keyExtractor={(u) => u.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.userItem}
                    onPress={() => handleAuthorizeUser(item.id, item.username)}
                  >
                    <Text style={styles.userName}>{item.username}</Text>
                    <Text style={styles.userEmail}>{item.email || 'Pas d\'email'}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setUsersModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verify Modal */}
      <Modal visible={verifyModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Résultat de vérification</Text>
            {verifying ? (
              <ActivityIndicator size="large" color={theme.colors.black} style={{ marginVertical: theme.spacing.xl }} />
            ) : verifyResult ? (
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={verifyResult.overall_valid ? styles.statusSuccess : styles.statusFailed}>
                  <Text style={styles.statusResultText}>
                    {verifyResult.overall_valid ? "Chaîne valide et sécurisée" : "Erreur de vérification détectée"}
                  </Text>
                </View>

                <Text style={styles.verifyDetailText}>
                  Hash original : {verifyResult.original_hash?.substring(0, 20)}...
                </Text>
                <Text style={styles.verifyDetailText}>
                  Pages signatures : {verifyResult.file_has_signature_pages ? 'Oui' : 'Non'}
                </Text>
                <Text style={styles.verifyDetailText}>
                  Signatures totales : {verifyResult.total_signatures}
                </Text>

                <Text style={[styles.cardHeader, { marginTop: theme.spacing.md }]}>Détail des signatures</Text>
                {verifyResult.signatures_chain?.map((sig: any, index: number) => (
                  <View key={sig.signature_id} style={styles.chainItem}>
                    <Text style={styles.chainTitle}>#{index + 1} - {sig.signer_username}</Text>
                    <Text style={styles.chainMeta}>Payload : {sig.payload_match ? 'Valide' : 'Invalide'}</Text>
                    <Text style={styles.chainMeta}>Signature RSA : {sig.crypto_valid ? 'Valide' : 'Invalide'}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.closeButton} onPress={() => setVerifyModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PinModal
        visible={pinModalVisible}
        title="Code PIN requis"
        subtitle="Entrez votre code PIN pour signer"
        onConfirm={handlePinConfirm}
        onCancel={() => { setPinModalVisible(false); setPinError(''); }}
        errorMessage={pinError}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingTop: 50,
  },
  centerLoading: { 
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { 
    ...theme.typography.body,
    marginTop: theme.spacing.md,
  },
  backButton: { 
    marginBottom: theme.spacing.md,
  },
  backText: { 
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  headerSection: {
    marginBottom: theme.spacing.lg,
  },
  title: { 
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  ownerText: { 
    ...theme.typography.small,
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.black,
  },
  statusText: {
    ...theme.typography.bodyMedium,
    fontSize: 12,
  },
  card: { 
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: { 
    ...theme.typography.h4,
    marginBottom: theme.spacing.md,
  },
  cardHeaderRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  hashText: { 
    ...theme.typography.caption,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.gray100,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  addButton: { 
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.black,
  },
  addButtonText: { 
    ...theme.typography.bodyMedium,
    fontSize: 13,
  },
  signerItem: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  signerName: { 
    ...theme.typography.body,
    flex: 1,
  },
  signedBadge: { 
    backgroundColor: theme.colors.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  signedText: { 
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: { 
    backgroundColor: theme.colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pendingText: { 
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    ...theme.typography.small,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  actionsBox: { 
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  signButton: { 
    backgroundColor: theme.colors.black,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  signButtonText: { 
    ...theme.typography.bodyMedium,
    color: theme.colors.white,
    fontSize: 16,
  },
  alreadySignedBox: { 
    backgroundColor: theme.colors.gray100,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  alreadySignedText: { 
    ...theme.typography.bodyMedium,
  },
  verifyButton: { 
    backgroundColor: theme.colors.white,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.black,
  },
  verifyButtonText: { 
    ...theme.typography.bodyMedium,
  },
  logItem: { 
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.black,
    paddingLeft: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  logAction: { 
    ...theme.typography.bodyMedium,
  },
  logDetails: { 
    ...theme.typography.small,
    marginTop: 2,
  },
  logTime: { 
    ...theme.typography.caption,
    marginTop: 2,
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
    maxHeight: '80%',
  },
  modalTitle: { 
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  userItem: { 
    backgroundColor: theme.colors.gray100,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userName: { 
    ...theme.typography.bodyMedium,
    marginBottom: 2,
  },
  userEmail: { 
    ...theme.typography.small,
  },
  closeButton: { 
    backgroundColor: theme.colors.black,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  closeButtonText: { 
    ...theme.typography.bodyMedium,
    color: theme.colors.white,
  },
  statusSuccess: { 
    backgroundColor: theme.colors.black,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  statusFailed: { 
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.black,
  },
  statusResultText: { 
    ...theme.typography.bodyMedium,
    color: theme.colors.white,
    textAlign: 'center',
  },
  verifyDetailText: { 
    ...theme.typography.body,
    marginBottom: 6,
  },
  chainItem: { 
    backgroundColor: theme.colors.gray100,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chainTitle: { 
    ...theme.typography.bodyMedium,
    marginBottom: 4,
  },
  chainMeta: { 
    ...theme.typography.small,
  },
});
