import { supabase } from './supabase';

// Storage bucket names
export const BUCKETS = {
  PHOTOS: 'photos',
  DOCUMENTS: 'documents',
  AVATARS: 'avatars'
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
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
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
 * Delete a file from storage
 * @param {string} fileUrl - The public URL of the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<boolean>}
 */
export const deleteFile = async (fileUrl, bucket = BUCKETS.PHOTOS) => {
  try {
    // Extract file path from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
    if (pathParts.length < 2) {
      throw new Error('Invalid file URL');
    }
    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
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
  getSignedUrl,
  listFiles,
  UploadFile,
  BUCKETS
};
