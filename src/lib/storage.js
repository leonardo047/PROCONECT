// Cache bust: 2026-02-04-v5
import { supabase } from './supabase';

// Storage bucket names
export const BUCKETS = {
  PHOTOS: 'photos',
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
  PORTFOLIO: 'portfolio'
};

// Limites de tamanho por bucket (em bytes)
export const SIZE_LIMITS = {
  PHOTOS: 10 * 1024 * 1024,     // 10 MB
  DOCUMENTS: 20 * 1024 * 1024,  // 20 MB
  AVATARS: 5 * 1024 * 1024,     // 5 MB
  PORTFOLIO: 10 * 1024 * 1024   // 10 MB
};

// Tipos permitidos por bucket
export const ALLOWED_TYPES = {
  PHOTOS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'image/jpeg', 'image/png'],
  AVATARS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  PORTFOLIO: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * Obtém a sessão diretamente do localStorage para evitar race conditions do Supabase client
 */
const getSessionFromLocalStorage = () => {
  const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!supabaseKey) {
    return null;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(supabaseKey));
    if (stored?.access_token && stored?.user) {
      return {
        access_token: stored.access_token,
        user: stored.user
      };
    }
  } catch (e) {
    // Ignorar erro
  }
  return null;
};

/**
 * Verifica sessão com timeout para evitar bloqueio
 */
const getSessionWithTimeout = async (timeoutMs = 5000) => {
  // Primeiro tentar obter do localStorage (mais rápido e confiável)
  const localSession = getSessionFromLocalStorage();
  if (localSession) {
    return { data: { session: localSession } };
  }

  // Fallback para o Supabase client com timeout
  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout ao verificar sessao')), timeoutMs);
  });

  try {
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    return result;
  } catch (error) {
    throw new Error('Voce precisa estar logado para fazer upload.');
  }
};

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The bucket name (default: 'photos')
 * @param {string} folder - Optional folder path within the bucket
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadFile = async (file, bucket = BUCKETS.PHOTOS, folder = '') => {
  try {
    // Verificar autenticação com timeout
    const { data: { session }, error: sessionError } = await getSessionWithTimeout(5000);

    if (!session) {
      throw new Error('Voce precisa estar logado para fazer upload de fotos. Por favor, faca login novamente.');
    }

    // Determinar qual bucket está sendo usado para validação
    const bucketKey = Object.keys(BUCKETS).find(key => BUCKETS[key] === bucket) || 'PHOTOS';
    const maxSize = SIZE_LIMITS[bucketKey];
    const allowedTypes = ALLOWED_TYPES[bucketKey];

    // Validar tamanho do arquivo
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new Error(`Arquivo muito grande. Tamanho maximo permitido: ${maxSizeMB} MB`);
    }

    // Validar tipo do arquivo
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de arquivo nao permitido. Formatos aceitos: JPG, PNG, GIF, WebP`);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload usando fetch direto (evita race condition do Supabase client)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const accessToken = session.access_token;

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000);

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-upsert': 'false'
        },
        body: file,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no upload: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Construir URL pública
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;

      return publicUrl;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Upload demorou muito. Verifique sua conexao e tente novamente.');
      }
      throw fetchError;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Upload multiple files
 * @param {File[]} files - Array of files to upload
 * @param {string} bucket - The bucket name
 * @param {string} folder - Optional folder path
 * @returns {Promise<string[]>} - Array of public URLs
 */
export const uploadMultipleFiles = async (files, bucket = BUCKETS.PHOTOS, folder = '') => {
  const uploadPromises = files.map(file => uploadFile(file, bucket, folder));
  return Promise.all(uploadPromises);
};

/**
 * Extrai o caminho do arquivo a partir da URL pública
 * @param {string} fileUrl - URL pública do arquivo
 * @param {string} bucket - Nome do bucket
 * @returns {string|null} - Caminho do arquivo ou null se inválido
 */
export const extractFilePath = (fileUrl, bucket) => {
  if (!fileUrl) return null;
  try {
    const url = new URL(fileUrl);
    // Tenta extrair do formato padrão: /storage/v1/object/public/{bucket}/{path}
    const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
    if (pathParts.length >= 2) {
      return decodeURIComponent(pathParts[1]);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Delete a file from storage using fetch API (mais confiável que o cliente Supabase)
 * @param {string} fileUrl - The public URL of the file
 * @param {string} bucket - The bucket name (se não fornecido, tenta detectar da URL)
 * @returns {Promise<boolean>}
 */
export const deleteFile = async (fileUrl, bucket = null) => {
  if (!fileUrl) {
    return true;
  }

  try {
    // Detectar bucket da URL se não fornecido
    let detectedBucket = bucket;
    if (!detectedBucket) {
      for (const [key, bucketName] of Object.entries(BUCKETS)) {
        if (fileUrl.includes(`/public/${bucketName}/`)) {
          detectedBucket = bucketName;
          break;
        }
      }
    }

    if (!detectedBucket) {
      throw new Error('Bucket não detectado na URL');
    }

    const filePath = extractFilePath(fileUrl, detectedBucket);
    if (!filePath) {
      throw new Error('Caminho do arquivo inválido');
    }

    // Buscar token de autenticação do localStorage
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    let accessToken = supabaseAnonKey;
    const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (supabaseKey) {
      try {
        const stored = JSON.parse(localStorage.getItem(supabaseKey));
        if (stored?.access_token) {
          accessToken = stored.access_token;
        }
      } catch (e) {
        // Ignorar erro
      }
    }

    // Usar fetch diretamente para deletar
    const deleteUrl = `${supabaseUrl}/storage/v1/object/${detectedBucket}/${filePath}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao deletar: ${response.status} - ${errorText}`);
    }

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Replace a file (upload new, delete old)
 * @param {File} newFile - The new file to upload
 * @param {string} oldFileUrl - The URL of the old file to delete (optional)
 * @param {string} bucket - The bucket name
 * @param {string} folder - Optional folder path
 * @returns {Promise<string>} - The public URL of the new file
 */
export const replaceFile = async (newFile, oldFileUrl = null, bucket = BUCKETS.PHOTOS, folder = '') => {
  try {
    // Upload do novo arquivo primeiro
    const newUrl = await uploadFile(newFile, bucket, folder);

    // Se tinha arquivo antigo, deletar
    if (oldFileUrl && oldFileUrl !== newUrl) {
      try {
        await deleteFile(oldFileUrl, bucket);
      } catch (deleteError) {
        // Ignorar erro - o novo arquivo já foi enviado
      }
    }

    return newUrl;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete multiple files
 * @param {string[]} fileUrls - Array of file URLs
 * @param {string} bucket - The bucket name
 * @returns {Promise<boolean>}
 */
export const deleteMultipleFiles = async (fileUrls, bucket = BUCKETS.PHOTOS) => {
  const deletePromises = fileUrls.map(url => deleteFile(url, bucket));
  await Promise.all(deletePromises);
  return true;
};

/**
 * Get signed URL for private files (with expiration)
 * @param {string} filePath - The file path in the bucket
 * @param {string} bucket - The bucket name
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>}
 */
export const getSignedUrl = async (filePath, bucket = BUCKETS.DOCUMENTS, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
};

/**
 * List files in a folder
 * @param {string} folder - The folder path
 * @param {string} bucket - The bucket name
 * @returns {Promise<Array>}
 */
export const listFiles = async (folder = '', bucket = BUCKETS.PHOTOS) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) throw error;
  return data;
};

// Alias for backward compatibility with Base44 integration
export const UploadFile = uploadFile;

export default {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  deleteMultipleFiles,
  replaceFile,
  extractFilePath,
  getSignedUrl,
  listFiles,
  UploadFile,
  BUCKETS
};
