import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  ExternalLink,
  HardDrive,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  Clock,
  Eye,
  Check,
  FolderOpen,
  LogOut,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  getDriveAccessToken,
  getDriveUserInfo,
  findOrCreateAppFolder,
  listDriveBackups,
  uploadLosslessBackupToDrive,
  uploadCsvToDrive,
  downloadDriveFileContent,
  deleteDriveFile,
  DriveUserProfile,
  DriveFileItem,
} from '../services/googleDriveService';
import {
  createLosslessBackup,
  validateLosslessBackup,
  exportWardrobeToCsv,
  exportSalesToCsv,
  exportShoppingToCsv,
  compareLosslessBackups,
  LosslessBackupPayload,
  BackupDiffSummary,
} from '../services/losslessBackupService';
import { safeConfirm } from '../utils/safeConfirm';

interface GoogleDriveSyncPanelProps {
  onNotify: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const GoogleDriveSyncPanel: React.FC<GoogleDriveSyncPanelProps> = ({ onNotify }) => {
  const {
    items,
    outfits,
    shoppingList,
    saleItems,
    snapshots,
    changeLogs,
    categories,
    monthlyBudget,
    importDataJSON,
    createSnapshot,
    settings,
    updateSettings,
    formatCurrency,
  } = useWardrobe();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<DriveUserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Folder & File State
  const [driveFolder, setDriveFolder] = useState<{ id: string; name: string } | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Selected File Preview / Diff State
  const [inspectingFile, setInspectingFile] = useState<DriveFileItem | null>(null);
  const [inspectingPayload, setInspectingPayload] = useState<LosslessBackupPayload | null>(null);
  const [inspectingDiff, setInspectingDiff] = useState<BackupDiffSummary | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState<boolean>(false);

  // Destructive Confirmation Modal State (MANDATED by Workspace Skill)
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<DriveFileItem | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Currency helper
  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    }).format(val);
  };

  // Format bytes helper
  const formatBytes = (bytesStr?: string | number) => {
    if (!bytesStr) return '0 B';
    const bytes = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 1. Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      async (user, token) => {
        if (token) {
          setIsAuthenticated(true);
          try {
            const profile = await getDriveUserInfo(token);
            setUserProfile(profile);
            loadDriveFiles(token);
          } catch (err: any) {
            console.warn('Could not fetch user profile with existing token:', err);
          }
        } else {
          setIsAuthenticated(false);
          setUserProfile(null);
        }
      },
      () => {
        setIsAuthenticated(false);
        setUserProfile(null);
        setDriveFiles([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Fetch Drive Files
  const loadDriveFiles = useCallback(async (tokenOverride?: string) => {
    setIsLoadingFiles(true);
    try {
      const folder = await findOrCreateAppFolder(
        settings.googleDriveSettings?.backupFolderName || 'Wardrobe & Style Studio Backups',
        tokenOverride
      );
      setDriveFolder(folder);
      const files = await listDriveBackups(folder.id, tokenOverride);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Error loading Drive backups:', err);
      onNotify('error', err.message || 'Failed to load files from Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [settings.googleDriveSettings?.backupFolderName, onNotify]);

  // 3. Handle Sign In
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { accessToken } = await signInWithGoogleDrive();
      setIsAuthenticated(true);
      const profile = await getDriveUserInfo(accessToken);
      setUserProfile(profile);
      await loadDriveFiles(accessToken);
      onNotify('success', `Connected to Google Drive as ${profile.displayName || profile.emailAddress}!`);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(err.message || 'Failed to sign in with Google Drive.');
      onNotify('error', err.message || 'Google Drive sign-in failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 4. Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOutGoogleDrive();
      setIsAuthenticated(false);
      setUserProfile(null);
      setDriveFiles([]);
      setDriveFolder(null);
      setInspectingFile(null);
      onNotify('info', 'Disconnected from Google Drive.');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // 5. Upload Lossless Wardrobe Backup to Google Drive
  const handleUploadBackup = async () => {
    if (!isAuthenticated) {
      await handleSignIn();
      return;
    }

    setIsUploading(true);
    try {
      const payload = createLosslessBackup({
        items,
        outfits,
        shoppingList,
        saleItems,
        snapshots,
        changeLogs,
        categories,
        monthlyBudget,
      });

      const uploaded = await uploadLosslessBackupToDrive(
        payload,
        driveFolder?.id
      );

      // Record in settings
      updateSettings({
        googleDriveSettings: {
          ...settings.googleDriveSettings,
          lastBackupTime: new Date().toISOString(),
          backupFolderId: driveFolder?.id,
        },
      });

      onNotify(
        'success',
        `Successfully backed up ${payload.data.items.length} garments (${formatGbp(
          payload.metadata?.totalValuationGbp || 0
        )}) to Google Drive!`
      );

      // Refresh file list
      await loadDriveFiles();
    } catch (err: any) {
      console.error('Failed to upload backup:', err);
      onNotify('error', err.message || 'Could not upload backup to Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  // 6. Export CSV Reports to Google Drive
  const handleExportCsvsToDrive = async () => {
    if (!isAuthenticated) {
      await handleSignIn();
      return;
    }

    setIsExportingCsv(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const wardrobeCsv = exportWardrobeToCsv(items);
      const salesCsv = exportSalesToCsv(saleItems);
      const shoppingCsv = exportShoppingToCsv(shoppingList);

      await uploadCsvToDrive(
        `Wardrobe_Inventory_${today}_(${items.length}_items).csv`,
        wardrobeCsv,
        driveFolder?.id
      );

      await uploadCsvToDrive(
        `Resale_Archive_${today}_(${saleItems.length}_listings).csv`,
        salesCsv,
        driveFolder?.id
      );

      await uploadCsvToDrive(
        `Wishlist_Shopping_${today}_(${shoppingList.length}_targets).csv`,
        shoppingCsv,
        driveFolder?.id
      );

      onNotify('success', 'Exported 3 CSV reports directly to your Google Drive folder!');
      await loadDriveFiles();
    } catch (err: any) {
      console.error('Failed to export CSVs:', err);
      onNotify('error', err.message || 'Could not export CSVs to Google Drive.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // 7. Inspect File / Diff against Current Closet
  const handleInspectFile = async (file: DriveFileItem) => {
    setIsLoadingInspect(true);
    setInspectingFile(file);
    try {
      const rawText = await downloadDriveFileContent(file.id);
      const parsed = JSON.parse(rawText);
      const validation = validateLosslessBackup(parsed);

      if (!validation.valid) {
        onNotify('error', `Backup format invalid: ${validation.errors.join(', ')}`);
        setInspectingPayload(null);
        setInspectingDiff(null);
        return;
      }

      setInspectingPayload(parsed);

      // Calculate diff against current state
      const currentBackup = createLosslessBackup({
        items,
        outfits,
        shoppingList,
        saleItems,
        snapshots,
        changeLogs,
        categories,
        monthlyBudget,
      });

      const diff = compareLosslessBackups(parsed, currentBackup);
      setInspectingDiff(diff);
    } catch (err: any) {
      console.error('Failed to inspect file:', err);
      onNotify('error', err.message || 'Could not inspect file from Google Drive.');
      setInspectingFile(null);
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // 8. Restore Backup with Safety Snapshot (DESTRUCTIVE OPERATION CONFIRMATION)
  const handleConfirmRestore = async () => {
    if (!pendingRestoreFile) return;

    setIsRestoring(true);
    try {
      // 1. Download file content from Drive
      const rawText = await downloadDriveFileContent(pendingRestoreFile.id);
      const parsed = JSON.parse(rawText);
      const validation = validateLosslessBackup(parsed);

      if (!validation.valid) {
        throw new Error(`Backup corrupted: ${validation.errors.join('; ')}`);
      }

      // 2. Take automatic safety snapshot before rewinding
      createSnapshot(
        `Pre-Drive Restore Snapshot (${new Date().toLocaleTimeString()})`,
        `Preserved state prior to restoring Google Drive backup '${pendingRestoreFile.name}'`
      );

      // 3. Restore data into wardrobe context
      importDataJSON(rawText);

      onNotify(
        'success',
        `Successfully restored wardrobe from Google Drive backup '${pendingRestoreFile.name}'! (Safety rollback snapshot created).`
      );
      setPendingRestoreFile(null);
      setInspectingFile(null);
    } catch (err: any) {
      console.error('Error restoring from Drive:', err);
      onNotify('error', err.message || 'Failed to restore backup from Google Drive.');
    } finally {
      setIsRestoring(false);
    }
  };

  // 9. Delete File with Confirmation (DESTRUCTIVE OPERATION MANDATE)
  const handleConfirmDelete = async () => {
    if (!pendingDeleteFile) return;

    setIsDeleting(true);
    try {
      await deleteDriveFile(pendingDeleteFile.id);
      onNotify('success', `Deleted '${pendingDeleteFile.name}' from Google Drive.`);
      setDriveFiles((prev) => prev.filter((f) => f.id !== pendingDeleteFile.id));
      if (inspectingFile?.id === pendingDeleteFile.id) {
        setInspectingFile(null);
      }
      setPendingDeleteFile(null);
    } catch (err: any) {
      console.error('Error deleting file:', err);
      onNotify('error', err.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card: Authentication & Account Overview */}
      <div className="bg-white border border-[#E5E5E1] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FAF9F5] border border-[#E5E5E1] flex items-center justify-center text-[#8C7355] shrink-0">
              <Cloud className="w-5 h-5 text-[#4285F4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  Google Drive Cloud Vault
                </h3>
                {isAuthenticated ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-stone-100 text-[#767670] border border-stone-200">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-[#767670] font-sans mt-0.5">
                Automatically backup and sync your entire wardrobe, £ valuations, lookbook formulas, and CSV reports directly to your Google Drive account.
              </p>
            </div>
          </div>

          {/* Auth Controls */}
          <div>
            {isAuthenticated && userProfile ? (
              <div className="flex items-center gap-3">
                {userProfile.photoLink ? (
                  <img
                    src={userProfile.photoLink}
                    alt={userProfile.displayName}
                    className="w-8 h-8 rounded-full border border-[#E5E5E1]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#8C7355] text-white flex items-center justify-center font-bold text-xs">
                    {userProfile.displayName[0] || 'G'}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-[#1A1A1A] leading-tight">
                    {userProfile.displayName}
                  </div>
                  <div className="text-[10px] font-mono text-[#767670]">
                    {userProfile.emailAddress}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1.5 text-[#767670] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  title="Disconnect Google Drive"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#dadce0] hover:bg-[#f8f9fa] shadow-2xs text-xs font-sans font-medium text-[#3c4043] transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="w-4 h-4 shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <span>{isAuthenticating ? 'Connecting to Google…' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quota bar if available */}
        {isAuthenticated && userProfile?.storageQuota && (
          <div className="mt-4 pt-3 border-t border-[#F0EFEB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-[#767670]" />
              <span className="font-mono text-[11px] text-[#767670]">
                Google Drive Storage: {formatBytes(userProfile.storageQuota.usageInDrive || userProfile.storageQuota.usage)} used
                {userProfile.storageQuota.limit ? ` of ${formatBytes(userProfile.storageQuota.limit)}` : ''}
              </span>
            </div>
            {driveFolder && (
              <a
                href={`https://drive.google.com/drive/folders/${driveFolder.id}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#4285F4] hover:underline"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Folder &quot;{driveFolder.name}&quot;</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* 2. Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleUploadBackup}
          disabled={isUploading}
          className="p-4 bg-white hover:bg-[#FAF9F5] border border-[#E5E5E1] text-left transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#8C7355]/10 text-[#8C7355] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C7355] font-bold">
              Instant
            </span>
          </div>
          <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
            {isUploading ? 'Backing Up to Drive…' : 'Backup to Google Drive'}
          </h4>
          <p className="text-xs text-[#767670] mt-1">
            Exports full lossless JSON containing {items.length} garments and £{formatGbp(items.reduce((s, i) => s + (i.purchasePrice || 0), 0))} valuation.
          </p>
        </button>

        <button
          type="button"
          onClick={handleExportCsvsToDrive}
          disabled={isExportingCsv}
          className="p-4 bg-white hover:bg-[#FAF9F5] border border-[#E5E5E1] text-left transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold">
              3 Sheets
            </span>
          </div>
          <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
            {isExportingCsv ? 'Uploading CSVs…' : 'Export CSVs to Drive'}
          </h4>
          <p className="text-xs text-[#767670] mt-1">
            Generates structured CSVs for Wardrobe Inventory, Resale Archive, and Wishlist to open in Google Sheets.
          </p>
        </button>

        <div className="p-4 bg-white border border-[#E5E5E1] text-left shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.googleDriveSettings?.autoBackupEnabled || false}
                  onChange={(e) => {
                    updateSettings({
                      googleDriveSettings: {
                        ...settings.googleDriveSettings,
                        autoBackupEnabled: e.target.checked,
                      },
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-[#CCCCCC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#4285F4]"></div>
              </label>
            </div>
            <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
              Auto-Sync to Drive
            </h4>
            <p className="text-xs text-[#767670] mt-1">
              {settings.googleDriveSettings?.autoBackupEnabled
                ? 'Active: Snapshots will automatically archive into your Google Drive folder.'
                : 'Disabled: Enable to preserve automatic background archives to Google Drive.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Google Drive Backups Browser */}
      <div className="bg-white border border-[#E5E5E1] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-sm text-[#1A1A1A]">
              Google Drive Cloud Backups ({driveFiles.length})
            </h3>
            {driveFolder && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF9F5] border border-[#E5E5E1] text-[#767670]">
                📁 {driveFolder.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDriveFiles()}
              disabled={isLoadingFiles || !isAuthenticated}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F8F7F4] border border-[#E5E5E1] text-[#5A5A55] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Refresh Files</span>
            </button>
          </div>
        </div>

        {/* File Table / List */}
        {!isAuthenticated ? (
          <div className="py-12 text-center bg-[#FAF9F5] border border-dashed border-[#CCCCCC] p-6 space-y-3">
            <Cloud className="w-8 h-8 text-[#999] mx-auto" />
            <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
              Sign in to view your Google Drive archives
            </h4>
            <p className="text-xs text-[#767670] max-w-md mx-auto">
              Connect your Google account to browse, restore, and organize lossless wardrobe backups directly from your cloud drive.
            </p>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
            >
              Connect Google Drive
            </button>
          </div>
        ) : isLoadingFiles ? (
          <div className="py-10 text-center space-y-2">
            <RefreshCw className="w-5 h-5 text-[#8C7355] animate-spin mx-auto" />
            <p className="text-xs font-mono text-[#767670]">Syncing file list from Google Drive…</p>
          </div>
        ) : driveFiles.length === 0 ? (
          <div className="py-10 text-center bg-[#FAF9F5] border border-dashed border-[#CCCCCC] p-6 space-y-3">
            <HardDrive className="w-7 h-7 text-[#8C7355] mx-auto opacity-70" />
            <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">No backup files in Google Drive yet</h4>
            <p className="text-xs text-[#767670] max-w-md mx-auto">
              Click &apos;Backup to Google Drive&apos; above to save your first byte-for-byte lossless archive.
            </p>
            <button
              type="button"
              onClick={handleUploadBackup}
              disabled={isUploading}
              className="px-4 py-1.5 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
            >
              Create First Cloud Backup
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EFEB] border border-[#E5E5E1]">
            {driveFiles.map((file) => {
              const isJson = file.isWardrobeBackup;
              const dateStr = new Date(file.modifiedTime).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={file.id}
                  className="p-3.5 bg-white hover:bg-[#FAF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#FAF9F5] border border-[#E5E5E1] flex items-center justify-center shrink-0">
                      {isJson ? (
                        <FileText className="w-4 h-4 text-[#8C7355]" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-mono font-bold text-[#1A1A1A] truncate max-w-md">
                          {file.name}
                        </h5>
                        {file.itemCount !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-stone-100 text-[#4A4A45] border border-stone-200">
                            {file.itemCount} pieces
                          </span>
                        )}
                        {file.totalValuationGbp !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FAF9F5] text-[#8C7355] border border-[#E5E5E1] font-bold">
                            {formatGbp(file.totalValuationGbp)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-[#767670] mt-0.5">
                        Modified {dateStr} • {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {isJson && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleInspectFile(file)}
                          className="px-2 py-1 text-xs font-mono text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-stone-100 border border-[#E5E5E1] flex items-center gap-1 cursor-pointer"
                          title="Inspect backup payload and calculate diff"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingRestoreFile(file)}
                          className="px-2.5 py-1 text-xs font-mono font-bold bg-[#1A1A1A] hover:bg-[#333] text-white flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Restore closet from this Google Drive file"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      </>
                    )}

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="p-1.5 text-[#767670] hover:text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#FAF9F5]"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setPendingDeleteFile(file)}
                      className="p-1.5 text-[#767670] hover:text-rose-600 hover:bg-rose-50 border border-[#E5E5E1] hover:border-rose-200 cursor-pointer"
                      title="Delete from Google Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Inspect / Diff Modal */}
      {inspectingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8C7355]" />
                <h4 className="font-serif font-bold text-sm text-[#1A1A1A] truncate max-w-md">
                  Inspect: {inspectingFile.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingFile(null)}
                className="text-[#767670] hover:text-[#1A1A1A] font-bold text-base px-1"
              >
                ×
              </button>
            </div>

            {isLoadingInspect ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-5 h-5 text-[#8C7355] animate-spin mx-auto" />
                <p className="text-xs font-mono text-[#767670]">Validating archive checksum and computing diff…</p>
              </div>
            ) : inspectingDiff && inspectingPayload ? (
              <div className="space-y-4 text-xs font-mono">
                {/* Checksum & Status */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">Byte-for-byte SHA Checksum Verified</span>
                  </div>
                  <span className="text-[10px] text-emerald-800">{inspectingPayload.integrityChecksum}</span>
                </div>

                {/* Diff Comparison Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg">
                    <div className="text-[10px] text-[#767670]">Garments in Drive</div>
                    <div className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                      {inspectingDiff.incomingItemsCount} pieces
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg">
                    <div className="text-[10px] text-[#767670]">Currently in Closet</div>
                    <div className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                      {inspectingDiff.currentItemsCount} pieces
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg">
                    <div className="text-[10px] text-[#767670]">New Items in Drive</div>
                    <div className="text-sm font-bold text-emerald-700 mt-0.5">
                      +{inspectingDiff.newItemsCount}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg">
                    <div className="text-[10px] text-[#767670]">Valuation Difference</div>
                    <div className={`text-sm font-bold mt-0.5 ${inspectingDiff.valuationDifferenceGbp >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {inspectingDiff.valuationDifferenceGbp >= 0 ? '+' : ''}
                      {formatGbp(inspectingDiff.valuationDifferenceGbp)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#E5E5E1] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setInspectingFile(null)}
                    className="px-3 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A]"
                  >
                    Close Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRestoreFile(inspectingFile);
                    }}
                    className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Proceed to Restore</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 5. MANDATORY CONFIRMATION DIALOG: RESTORING BACKUP */}
      {pendingRestoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-[#1A1A1A]">
                  Restore from Google Drive?
                </h4>
                <p className="text-xs text-[#767670]">
                  This will replace your current wardrobe data with the contents of &apos;{pendingRestoreFile.name}&apos;.
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Safety Rollback Guarantee</span>
              </div>
              <p>
                An automatic rollback checkpoint of your current closet state will be created immediately before the restoration.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E1]">
              <button
                type="button"
                onClick={() => setPendingRestoreFile(null)}
                disabled={isRestoring}
                className="px-3.5 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring…</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MANDATORY CONFIRMATION DIALOG: DELETING FILE (Strictly Required by Workspace Skill) */}
      {pendingDeleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-rose-200 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-rose-900">
                  Delete File from Google Drive?
                </h4>
                <p className="text-xs text-[#767670]">
                  Are you sure you want to permanently remove &apos;{pendingDeleteFile.name}&apos; from your Google Drive?
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg text-xs font-mono text-[#5A5A55] space-y-1">
              <div><strong>Target:</strong> {pendingDeleteFile.name}</div>
              <div><strong>Size:</strong> {formatBytes(pendingDeleteFile.size)}</div>
              <div><strong>Modified:</strong> {new Date(pendingDeleteFile.modifiedTime).toLocaleString()}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E1]">
              <button
                type="button"
                onClick={() => setPendingDeleteFile(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
