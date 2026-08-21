import Constants from 'expo-constants';
import { getAccessToken } from './secureStore';

// Auto-détection de l'IP du serveur de dev (ex: 192.168.1.185) pour Expo Go sur téléphone physique
function getBackendBaseUrl(): string {
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:8000/api`;
    }
  } catch (e) {
    console.warn('[API] Unable to detect host IP:', e);
  }
  return 'http://localhost:8000/api';
}

export const API_BASE_URL = getBackendBaseUrl();
console.log('[API] Backend URL detected:', API_BASE_URL);
export const FALLBACK_URLS = [
  API_BASE_URL,
  'http://192.168.1.162:8000/api',
  'http://localhost:8000/api',
  'http://10.0.2.2:8000/api'
];

async function fetchWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let lastError: any = null;
  // Essayer l'IP LAN auto-détectée, puis localhost, puis 10.0.2.2
  for (const baseUrl of FALLBACK_URLS) {
    try {
      const fullUrl = `${baseUrl}${endpoint}`;
      const response = await fetch(fullUrl, { ...options, headers });
      return response;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Impossible de se connecter au serveur backend. Vérifiez que Django est lancé.");
}

export const api = {
  async register(username: string, email: string, password: string, publicKeyPem: string) {
    const res = await fetchWithFallback('/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, public_key: publicKeyPem })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.username?.[0] || errData.public_key?.[0] || 'Échec de l\'inscription');
    }
    return res.json();
  },

  async login(username: string, password: string) {
    const res = await fetchWithFallback('/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Identifiants incorrects');
    }
    return res.json(); // { access, refresh }
  },

  async getProfile() {
    const res = await fetchWithFallback('/auth/profile/');
    if (!res.ok) throw new Error('Erreur de chargement du profil');
    return res.json();
  },

  async updatePublicKey(publicKeyPem: string) {
    const res = await fetchWithFallback('/auth/profile/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: publicKeyPem })
    });
    if (!res.ok) throw new Error('Impossible de mettre à jour la clé publique');
    return res.json();
  },

  async getUsers() {
    const res = await fetchWithFallback('/users/');
    if (!res.ok) throw new Error('Impossible de charger les utilisateurs');
    return res.json();
  },

  async getDocuments(filter: 'all' | 'created' | 'assigned' = 'all') {
    const res = await fetchWithFallback(`/documents/?filter=${filter}`);
    if (!res.ok) throw new Error('Impossible de charger les documents');
    return res.json();
  },

  async getDocumentDetail(id: number) {
    const res = await fetchWithFallback(`/documents/${id}/`);
    if (!res.ok) throw new Error('Impossible de charger le document');
    return res.json();
  },

  async uploadDocument(title: string, fileUri: string, fileName: string, mimeType: string = 'application/pdf') {
    const formData = new FormData();
    formData.append('title', title);

    const fileObj: any = {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    };
    formData.append('file', fileObj);

    const res = await fetchWithFallback('/documents/', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Échec de l\'envoi du document PDF');
    }
    return res.json();
  },

  async authorizeSigner(documentId: number, userId: number) {
    const res = await fetchWithFallback(`/documents/${documentId}/authorize/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur lors de l\'ajout du signataire');
    }
    return res.json();
  },

  async signDocument(documentId: number, signatureValueBase64: string) {
    const res = await fetchWithFallback(`/documents/${documentId}/sign/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_value: signatureValueBase64 })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Échec de l\'enregistrement de la signature');
    }
    return res.json();
  },

  async verifyDocument(documentId: number) {
    const res = await fetchWithFallback(`/documents/${documentId}/verify/`);
    if (!res.ok) throw new Error('Impossible de vérifier le document');
    return res.json();
  }
};
