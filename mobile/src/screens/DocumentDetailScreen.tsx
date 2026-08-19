import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { api } from '../services/api';
import { authenticateWithBiometrics } from '../services/biometrics';
import { getPrivateKey } from '../services/secureStore';
import { signPayload } from '../services/crypto';

export default function DocumentDetailScreen({ route, navigation }: any) {
  const { documentId } = route.params;

  const [document, setDocument] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Users Modal for authorization
  const [usersModalVisible, setUsersModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Verification Modal
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  // Signing state
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
      // Exclure ceux déjà autorisés
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
      Alert.alert('Succès', `Utilisateur ${username} ajouté comme signataire autorise !`);
      setUsersModalVisible(false);
      loadDetails();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec de l\'ajout du signataire.');
    }
  };

  const handleSignDocument = async () => {
    setSigning(true);
    try {
      // 1. Authentification biométrique simulée / réelle
      const bioRes = await authenticateWithBiometrics("Authentification biométrique requise pour signer le document");
      if (!bioRes.success) {
        Alert.alert('Annulé', bioRes.message);
        setSigning(false);
        return;
      }

      // 2. Récupérer la clé privée sur le téléphone
      const privateKeyPem = await getPrivateKey();
      if (!privateKeyPem) {
        Alert.alert('Erreur Clé Privée', 'Clé privée introuvable sur cet appareil. Veuillez vous réinscrire.');
        setSigning(false);
        return;
      }

      // 3. Déterminer le payload à signer (Dépendance de la dernière signature)
      const lastSignature = document.signatures?.[document.signatures.length - 1];
      let payloadToSign = document.file_hash;
      if (lastSignature) {
        payloadToSign = `${document.file_hash}:${lastSignature.signature_value}`;
      }

      // 4. Calculer la signature numérique RSA-SHA256
      const signatureBase64 = signPayload(privateKeyPem, payloadToSign);

      // 5. Transmettre au serveur Django
      await api.signDocument(documentId, signatureBase64);

      Alert.alert('Signature Validée ! ✍️', 'Votre signature numérique a été vérifiée et enregistrée sur la chaîne de confiance.');
      loadDetails();
    } catch (err: any) {
      Alert.alert('Échec de la signature', err.message || 'Une erreur est survenue.');
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
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Chargement du document...</Text>
      </View>
    );
  }

  const isOwner = document.owner === profile?.id;
  const isAuthorizedToSign = document.authorized_signers?.some((s: any) => s.user === profile?.id);
  const hasAlreadySigned = document.signatures?.some((s: any) => s.signer === profile?.id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back button & Title */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{document.title}</Text>
      <Text style={styles.ownerText}>Créé par : {document.owner_details?.username}</Text>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Informations du Document</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Statut :</Text>
          <Text style={styles.infoValue}>{document.status}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Empreinte SHA-256 :</Text>
        </View>
        <Text style={styles.hashText}>{document.file_hash}</Text>
      </View>

      {/* Signatures & Chain */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>Signataires Autorises ({document.authorized_signers?.length || 0})</Text>
          {isOwner && (
            <TouchableOpacity style={styles.addSignerBtn} onPress={openAddSignerModal}>
              <Text style={styles.addSignerBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>

        {document.authorized_signers?.map((signer: any) => {
          const sig = document.signatures?.find((s: any) => s.signer === signer.user);
          return (
            <View key={signer.id} style={styles.signerItem}>
              <Text style={styles.signerName}>👤 {signer.user_details?.username}</Text>
              {sig ? (
                <View style={styles.signedTag}>
                  <Text style={styles.signedTagText}>✓ Signé le {new Date(sig.signed_at).toLocaleTimeString()}</Text>
                </View>
              ) : (
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>⏳ En attente</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actionsBox}>
        {isAuthorizedToSign && !hasAlreadySigned && (
          <TouchableOpacity style={styles.signButton} onPress={handleSignDocument} disabled={signing}>
            {signing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signButtonText}>✍️ Signer avec ma clé privée</Text>}
          </TouchableOpacity>
        )}

        {hasAlreadySigned && (
          <View style={styles.alreadySignedBox}>
            <Text style={styles.alreadySignedText}>✅ Vous avez déjà signé ce document.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyChain}>
          <Text style={styles.verifyButtonText}>🛡️ Vérifier la chaîne cryptographique</Text>
        </TouchableOpacity>
      </View>

      {/* Audit Log timeline */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Journal d'Audit 📋</Text>
        {document.audit_logs?.map((log: any) => (
          <View key={log.id} style={styles.logItem}>
            <Text style={styles.logAction}>{log.action}</Text>
            <Text style={styles.logDetails}>{log.details}</Text>
            <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {/* Add Signer Modal */}
      <Modal visible={usersModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Autoriser un nouveau signataire 👤</Text>
            {allUsers.length === 0 ? (
              <Text style={styles.emptyUsers}>Tous les utilisateurs sont déjà autorisés.</Text>
            ) : (
              <FlatList
                data={allUsers}
                keyExtractor={(u) => u.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.userPickItem} onPress={() => handleAuthorizeUser(item.id, item.username)}>
                    <Text style={styles.userPickText}>👤 {item.username} ({item.email || 'Pas d\'email'})</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setUsersModalVisible(false)}>
              <Text style={styles.closeModalBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verify Chain Modal */}
      <Modal visible={verifyModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Résultat de Vérification 🛡️</Text>
            {verifying ? (
              <ActivityIndicator size="large" color="#38bdf8" style={{ marginVertical: 20 }} />
            ) : verifyResult ? (
              <ScrollView style={{ maxHeight: 300 }}>
                <View style={verifyResult.overall_valid ? styles.statusSuccess : styles.statusFailed}>
                  <Text style={styles.statusTextHeader}>
                    {verifyResult.overall_valid ? "✅ CHAÎNE 100% VALIDE ET SÉCURISÉE" : "❌ ERREUR DE VÉRIFICATION / MODIFICATION DÉTECTÉE"}
                  </Text>
                </View>

                <Text style={styles.verifyDetailText}>Fichier d'origine intact : {verifyResult.file_integrity_ok ? 'Oui' : 'Non (ALTÉRÉ !)'}</Text>
                <Text style={styles.verifyDetailText}>Signatures totales : {verifyResult.total_signatures}</Text>

                <Text style={[styles.cardHeader, { marginTop: 12 }]}>Détail des signatures :</Text>
                {verifyResult.signatures_chain?.map((sig: any, index: number) => (
                  <View key={sig.signature_id} style={styles.chainSigItem}>
                    <Text style={styles.chainSigTitle}>#{index + 1} Signataire : {sig.signer_username}</Text>
                    <Text style={styles.chainSigMeta}>Conformité payload : {sig.payload_match ? 'OK' : 'INVALID'}</Text>
                    <Text style={styles.chainSigMeta}>Signature cryptographique RSA : {sig.crypto_valid ? 'VALIDE' : 'INVALID'}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setVerifyModalVisible(false)}>
              <Text style={styles.closeModalBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 50 },
  centerLoading: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  backButton: { marginBottom: 14 },
  backText: { color: '#38bdf8', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  ownerText: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', marginBottom: 10 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel: { color: '#94a3b8', fontSize: 13 },
  infoValue: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold' },
  hashText: { color: '#64748b', fontFamily: 'monospace', fontSize: 11, backgroundColor: '#0f172a', padding: 8, borderRadius: 6 },
  addSignerBtn: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  addSignerBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  signerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#334155' },
  signerName: { color: '#f8fafc', fontSize: 14 },
  signedTag: { backgroundColor: '#166534', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  signedTagText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  pendingTag: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  pendingTagText: { color: '#cbd5e1', fontSize: 11 },
  actionsBox: { marginVertical: 8 },
  signButton: { backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  signButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  alreadySignedBox: { backgroundColor: '#16653420', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  alreadySignedText: { color: '#4ade80', fontWeight: 'bold', fontSize: 13 },
  verifyButton: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  verifyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  logItem: { borderLeftWidth: 2, borderLeftColor: '#38bdf8', paddingLeft: 10, marginBottom: 10 },
  logAction: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold' },
  logDetails: { color: '#94a3b8', fontSize: 12 },
  logTime: { color: '#64748b', fontSize: 10, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 16, textAlign: 'center' },
  emptyUsers: { color: '#94a3b8', textAlign: 'center', marginVertical: 20 },
  userPickItem: { backgroundColor: '#0f172a', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  userPickText: { color: '#f8fafc', fontSize: 14 },
  closeModalBtn: { backgroundColor: '#334155', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  closeModalBtnText: { color: '#FFF', fontWeight: 'bold' },
  statusSuccess: { backgroundColor: '#166534', padding: 12, borderRadius: 8, marginBottom: 12 },
  statusFailed: { backgroundColor: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12 },
  statusTextHeader: { color: '#FFF', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  verifyDetailText: { color: '#cbd5e1', fontSize: 13, marginBottom: 4 },
  chainSigItem: { backgroundColor: '#0f172a', padding: 10, borderRadius: 6, marginBottom: 6 },
  chainSigTitle: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  chainSigMeta: { color: '#94a3b8', fontSize: 11 }
});
