// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Utility functions for handling Google Cloud Storage URIs and file access
 */

// Cloud Function endpoint for storage access
// This will be replaced with the actual deployed function URL
const STORAGE_ACCESS_URL = import.meta.env.VITE_STORAGE_ACCESS_URL;

/**
 * Check if a URI is a Google Cloud Storage URI
 * @param uri - The URI to check
 * @returns true if it's a GCS URI (gs://...)
 */
export function isGcsUri(uri: string | undefined | null): boolean {
  if (!uri) return false;
  return uri.startsWith('gs://');
}

/**
 * Convert a GCS URI to a storage access function URL
 * @param gcsUri - The GCS URI (gs://bucket/path/to/file)
 * @returns URL to access the file through the Cloud Function
 */
export function getStorageAccessUrl(gcsUri: string): string {
  if (!isGcsUri(gcsUri)) {
    // If it's not a GCS URI, return as-is (might be a regular HTTP URL)
    return gcsUri;
  }
  
  // Encode the URI to handle special characters
  const encodedUri = encodeURIComponent(gcsUri);
  return `${STORAGE_ACCESS_URL}?uri=${encodedUri}`;
}

/**
 * Get file metadata from a GCS URI without downloading the file
 * @param gcsUri - The GCS URI
 * @param authToken - Firebase ID token for authentication
 * @returns Promise with file metadata or null if not found
 */
export async function getFileMetadata(gcsUri: string, authToken?: string): Promise<any | null> {
  try {
    const metadataUrl = `${STORAGE_ACCESS_URL}/metadata?uri=${encodeURIComponent(gcsUri)}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    const response = await fetch(metadataUrl, { headers });
    
    if (!response.ok) {
      console.error('Failed to fetch file metadata:', response.statusText);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    return null;
  }
}

/**
 * Open a GCS file in a new tab with authentication
 * @param gcsUri - The GCS URI
 * @param authToken - Firebase ID token for authentication
 */
export async function openGcsFile(gcsUri: string, authToken?: string): Promise<void> {
  try {
    const url = getStorageAccessUrl(gcsUri);
    const headers: HeadersInit = {};
    
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to open file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    
    // Clean up the blob URL after a short delay to allow the browser to load it
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
}

/**
 * Download a GCS file
 * @param gcsUri - The GCS URI
 * @param authToken - Firebase ID token for authentication
 * @param filename - Optional filename for download
 */
export async function downloadGcsFile(gcsUri: string, authToken?: string, filename?: string): Promise<void> {
  try {
    const url = getStorageAccessUrl(gcsUri);
    const headers: HeadersInit = {};
    
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename || gcsUri.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Extract filename from GCS URI
 * @param gcsUri - The GCS URI
 * @returns The filename or empty string
 */
export function getFilenameFromGcsUri(gcsUri: string): string {
  if (!isGcsUri(gcsUri)) return '';
  
  const parts = gcsUri.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Extract bucket name from GCS URI
 * @param gcsUri - The GCS URI
 * @returns The bucket name or empty string
 */
export function getBucketFromGcsUri(gcsUri: string): string {
  if (!isGcsUri(gcsUri)) return '';
  
  const match = gcsUri.match(/^gs:\/\/([^\/]+)/);
  return match ? match[1] : '';
}
