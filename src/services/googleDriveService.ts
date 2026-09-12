/**
 * Google Drive Workspace Integration Service
 * Provides client-side OAuth authentication via Firebase Auth with in-memory token caching,
 * and comprehensive Google Drive REST API v3 operations for Wardrobe & Style Studio:
 * - Lossless backup persistence & restoration
 * - CSV report exports (Wardrobe, Wishlist, Resale)
 * - Drive file exploration & search
 * - Storage quota monitoring
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LosslessBackupPayload } from './losslessBackupService';

// Initialize or reuse Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// All Google Drive scopes approved for this applet
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

const provider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// STRICT IN-MEMORY TOKEN CACHING (Mandated by workspace skill: never persist in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveUserProfile {
  displayName: string;
  emailAddress: string;
  photoLink?: string;
  storageQuota?: {
    limit?: string; // in bytes
    usage?: string; // in bytes
    usageInDrive?: string; // in bytes
    usageInDriveTrash?: string; // in bytes
  };
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  // Parsed metadata if it's a wardrobe backup
  isWardrobeBackup?: boolean;
  itemCount?: number;
  totalValuationGbp?: number;
  integrityChecksum?: string;
  exportedAt?: string;
}

/**
 * Initialize Drive auth state listener.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google to obtain OAuth access token for Google Drive.
 * Must be triggered by a direct user gesture (button click).
 */
export const signInWithGoogleDrive = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return an OAuth access token for Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve the current in-memory access token.
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sign out of Google Drive and wipe the cached in-memory access token.
 */
export const signOutGoogleDrive = async () => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
  }
};

/**
 * Fetch authenticated user information and Google Drive storage quota.
 */
export const getDriveUserInfo = async (tokenOverride?: string): Promise<DriveUserProfile> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to fetch Drive profile (${res.status})`);
  }

  const data = await res.json();
  return {
    displayName: data.user?.displayName || 'Google User',
    emailAddress: data.user?.emailAddress || '',
    photoLink: data.user?.photoLink,
    storageQuota: data.storageQuota,
  };
};

/**
 * Locate or automatically create the dedicated folder in the user's Drive.
 */
export const findOrCreateAppFolder = async (
  folderName = 'Wardrobe & Style Studio Backups',
  tokenOverride?: string
): Promise<{ id: string; name: string }> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  // Check if folder already exists
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(
    /'/g,
    "\\'"
  )}' and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return { id: searchData.files[0].id, name: searchData.files[0].name };
    }
  }

  // Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Automated backups, reports, and lossless archives for Wardrobe & Style Studio.',
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to create Drive backup folder.');
  }

  const newFolder = await createRes.json();
  return { id: newFolder.id, name: newFolder.name };
};

/**
 * List all backup files and spreadsheets within the dedicated folder or matching the wardrobe prefix.
 */
export const listDriveBackups = async (
  folderId?: string,
  tokenOverride?: string
): Promise<DriveFileItem[]> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  let q = 'trashed = false';
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  } else {
    q += ` and (name contains 'Wardrobe' or name contains 'humidor' or name contains 'closet')`;
  }

  const fields =
    'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink,parents,properties,description)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to list files from Google Drive.');
  }

  const data = await res.json();
  const files: DriveFileItem[] = (data.files || []).map((f: any) => {
    // Attempt to extract item count or valuation from file name or description if available
    const isJson = f.mimeType === 'application/json' || f.name.endsWith('.json');
    let itemCount: number | undefined;
    let totalValuationGbp: number | undefined;

    // Check if filename has pattern like "Wardrobe_Backup_..._X_pieces_£Y"
    const piecesMatch = f.name.match(/(\d+)[-_]pieces/i);
    if (piecesMatch) itemCount = parseInt(piecesMatch[1], 10);

    const valMatch = f.name.match(/£([0-9,.]+)/);
    if (valMatch) totalValuationGbp = parseFloat(valMatch[1].replace(/,/g, ''));

    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      iconLink: f.iconLink,
      thumbnailLink: f.thumbnailLink,
      parents: f.parents,
      isWardrobeBackup: isJson,
      itemCount,
      totalValuationGbp,
    };
  });

  return files;
};

/**
 * Upload a complete Lossless Backup Payload to Google Drive.
 */
export const uploadLosslessBackupToDrive = async (
  payload: LosslessBackupPayload,
  folderId?: string,
  customName?: string,
  tokenOverride?: string
): Promise<DriveFileItem> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const itemCount = payload.data?.items?.length || 0;
  const valuation = payload.metadata?.totalValuationGbp || 0;
  const formattedVal = Math.round(valuation).toLocaleString('en-GB');

  const fileName =
    customName ||
    `Wardrobe_Backup_${timestamp}_(${itemCount}-pieces_£${formattedVal}).json`;

  const jsonContent = JSON.stringify(payload, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Lossless backup of Wardrobe & Style Studio (${itemCount} items, £${formattedVal} valuation). Checksum: ${payload.integrityChecksum}`,
    parents: folderId ? [folderId] : undefined,
    properties: {
      app: 'Wardrobe & Style Studio',
      formatVersion: payload.formatVersion,
      checksum: payload.integrityChecksum,
      itemCount: String(itemCount),
      valuationGbp: String(valuation),
    },
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to upload backup to Google Drive.');
  }

  const createdFile = await res.json();
  return {
    id: createdFile.id,
    name: createdFile.name,
    mimeType: createdFile.mimeType,
    size: createdFile.size || String(new Blob([jsonContent]).size),
    createdTime: createdFile.createdTime,
    modifiedTime: createdFile.modifiedTime,
    webViewLink: createdFile.webViewLink,
    isWardrobeBackup: true,
    itemCount,
    totalValuationGbp: valuation,
    integrityChecksum: payload.integrityChecksum,
    exportedAt: payload.exportedAt,
  };
};

/**
 * Upload a CSV report (Wardrobe Inventory, Resale Archive, or Wishlist) to Google Drive.
 */
export const uploadCsvToDrive = async (
  fileName: string,
  csvContent: string,
  folderId?: string,
  tokenOverride?: string
): Promise<DriveFileItem> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const metadata = {
    name: fileName,
    mimeType: 'text/csv',
    parents: folderId ? [folderId] : undefined,
    description: 'Exported report from Wardrobe & Style Studio',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/csv; charset=UTF-8\r\n\r\n' +
    csvContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to upload CSV to Google Drive.');
  }

  const createdFile = await res.json();
  return createdFile;
};

/**
 * Download file content directly from Google Drive.
 */
export const downloadDriveFileContent = async (
  fileId: string,
  tokenOverride?: string
): Promise<string> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to download file from Google Drive.');
  }

  return await res.text();
};

/**
 * Delete a file from Google Drive.
 * WARNING: Destructive operation! The calling UI MUST prompt the user for explicit confirmation!
 */
export const deleteDriveFile = async (
  fileId: string,
  tokenOverride?: string
): Promise<boolean> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to delete file from Google Drive.');
  }

  return true;
};
