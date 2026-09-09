import React, { useState, useEffect } from 'react';
import {
  GithubSyncConfig,
  loadGithubSyncConfig,
  saveGithubSyncConfig,
  validateGithubCredentials,
  pushDatabaseToGithub,
  pullDatabaseFromGithub,
} from '../services/githubSyncService';
import { useWardrobe } from '../context/WardrobeContext';
import { createLosslessBackup, validateLosslessBackup } from '../services/losslessBackupService';
import {
  Github,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  ExternalLink,
  Key,
  GitBranch,
  FolderGit2,
  FileCode,
  Info,
} from 'lucide-react';

interface GithubSyncPanelProps {
  onNotify: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const GithubSyncPanel: React.FC<GithubSyncPanelProps> = ({ onNotify }) => {
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
  } = useWardrobe();

  const [config, setConfig] = useState<GithubSyncConfig>(loadGithubSyncConfig);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [userProfile, setUserProfile] = useState<{ login: string; name: string; avatarUrl: string } | null>(null);
  const [repoDetails, setRepoDetails] = useState<{ fullName: string; defaultBranch: string; isPrivate: boolean } | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [customCommitMessage, setCustomCommitMessage] = useState('');

  // Save config changes
  const handleUpdateConfig = (patch: Partial<GithubSyncConfig>) => {
    const updated = { ...config, ...patch };
    setConfig(updated);
    saveGithubSyncConfig(updated);
  };

  // Test credentials on mount if token exists
  useEffect(() => {
    if (config.token && config.repo) {
      validateGithubCredentials(config.token, config.repo).then((res) => {
        if (res.success && res.user) {
          setUserProfile(res.user);
          if (res.repoDetails) setRepoDetails(res.repoDetails);
        }
      });
    }
  }, []);

  const handleVerify = async () => {
    if (!config.token.trim()) {
      onNotify('error', 'Please enter a GitHub Personal Access Token.');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await validateGithubCredentials(config.token, config.repo);
      if (res.success) {
        if (res.user) setUserProfile(res.user);
        if (res.repoDetails) setRepoDetails(res.repoDetails);
        onNotify('success', `GitHub verified! Connected as @${res.user?.login || 'user'}.`);
      } else {
        onNotify('error', res.message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePushNow = async () => {
    if (!config.token || !config.repo) {
      onNotify('error', 'Please configure your GitHub token and repository before syncing.');
      return;
    }

    setIsSyncing(true);
    handleUpdateConfig({ lastSyncStatus: 'syncing' });

    try {
      // Build full lossless payload
      const backupPayload = createLosslessBackup({
        items,
        outfits,
        shoppingList,
        saleItems,
        snapshots,
        changeLogs,
        categories,
        monthlyBudget,
      });

      const res = await pushDatabaseToGithub(
        config,
        backupPayload,
        customCommitMessage.trim() || undefined
      );

      const now = new Date().toISOString();
      if (res.success) {
        handleUpdateConfig({
          lastSyncTime: now,
          lastSyncStatus: 'success',
          lastSyncMessage: `Committed ${res.commitSha?.slice(0, 7) || 'latest'}`,
          lastCommitSha: res.commitSha || null,
        });
        onNotify(
          'success',
          `Successfully synced wardrobe to GitHub (${config.repo})! Commit: ${res.commitSha?.slice(0, 7) || 'synced'}`
        );
      } else {
        handleUpdateConfig({
          lastSyncStatus: 'error',
          lastSyncMessage: res.message,
        });
        onNotify('error', res.message);
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Push to GitHub failed.');
      handleUpdateConfig({ lastSyncStatus: 'error', lastSyncMessage: err?.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullNow = async () => {
    if (!config.token || !config.repo) {
      onNotify('error', 'Please configure your GitHub token and repository before pulling.');
      return;
    }

    if (
      !window.confirm(
        'Pulling from GitHub will update your closet with the repository backup. A safety rollback snapshot will be automatically created first. Continue?'
      )
    ) {
      return;
    }

    setIsPulling(true);
    try {
      const res = await pullDatabaseFromGithub(config);
      if (res.success && res.data) {
        // Create safety snapshot
        createSnapshot(
          '[Pre-GitHub Pull Safety]',
          `Automatic safety snapshot captured prior to pulling data from GitHub repository "${config.repo}".`,
          true
        );

        const validation = validateLosslessBackup(res.data);
        if (!validation.valid || !validation.payload) {
          onNotify('error', validation.errors[0] || 'Pulled file is not a recognized backup format.');
          return;
        }

        const importResult = importDataJSON(JSON.stringify(validation.payload.data));
        if (importResult.success) {
          onNotify('success', `Closet state restored from GitHub backup (${config.repo}/${config.filePath})!`);
        } else {
          onNotify('error', importResult.message || 'Failed to import backup data.');
        }
      } else {
        onNotify('error', res.message);
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Failed to pull from GitHub.');
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-white border border-[#E5E5E1] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] text-white flex items-center justify-center shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-[#1A1A1A]">
                  GitHub Cloud Repository Sync
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Lossless JSON
                </span>
              </div>
              <p className="text-xs text-[#767670] mt-0.5">
                Automatically store your complete wardrobe catalog, lookbooks, wishlist, and resale logs in your own private GitHub repository so you never lose data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePushNow}
              disabled={isSyncing || !config.token || !config.repo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>{isSyncing ? 'Syncing to GitHub...' : 'Push to GitHub'}</span>
            </button>
            <button
              type="button"
              onClick={handlePullNow}
              disabled={isPulling || !config.token || !config.repo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F2F1ED] text-[#1A1A1A] border border-[#D5D5D0] text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer transition"
            >
              {isPulling ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DownloadCloud className="w-3.5 h-3.5 text-[#8C7355]" />
              )}
              <span>{isPulling ? 'Pulling...' : 'Pull from Repo'}</span>
            </button>
          </div>
        </div>

        {/* Sync Status Bar */}
        <div className="mt-4 pt-3 border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#767670]">Status:</span>
            {config.lastSyncStatus === 'success' ? (
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Synchronized
              </span>
            ) : config.lastSyncStatus === 'error' ? (
              <span className="flex items-center gap-1 text-rose-700 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Error: {config.lastSyncMessage || 'Failed'}
              </span>
            ) : (
              <span className="text-[#767670]">Ready</span>
            )}
            {config.lastSyncTime && (
              <span className="text-[#767670] ml-2">
                Last synced:{' '}
                {new Date(config.lastSyncTime).toLocaleDateString()}{' '}
                {new Date(config.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {userProfile && (
            <div className="flex items-center gap-2 text-[#5A5A55]">
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.login}
                className="w-4 h-4 rounded-full border border-[#D5D5D0]"
              />
              <span>Connected as @{userProfile.login}</span>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connection Credentials */}
        <div className="p-4 bg-white border border-[#E5E5E1] space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#8C7355]" />
              GitHub Credentials
            </h4>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Wardrobe+Backup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-[#8C7355] hover:underline flex items-center gap-1"
            >
              <span>Generate PAT</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767670] mb-1">
              Personal Access Token (classic or fine-grained with repo scope)
            </label>
            <div className="relative">
              <input
                type={showTokenInput ? 'text' : 'password'}
                value={config.token}
                onChange={(e) => handleUpdateConfig({ token: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-[#FAF9F7] border border-[#D5D5D0] px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="absolute right-2.5 top-2 text-[10px] font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
              >
                {showTokenInput ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[10px] text-[#767670] mt-1 font-mono">
              Tokens are stored securely in your browser session and never sent to external servers.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767670] mb-1 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-[#8C7355]" />
              Target Repository (owner/repo)
            </label>
            <input
              type="text"
              value={config.repo}
              onChange={(e) => handleUpdateConfig({ repo: e.target.value })}
              placeholder="username/my-wardrobe-backup"
              className="w-full bg-[#FAF9F7] border border-[#D5D5D0] px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || !config.token}
              className="px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F2F1ED] text-[#1A1A1A] border border-[#D5D5D0] text-xs font-mono font-medium disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{isVerifying ? 'Verifying...' : 'Verify Access'}</span>
            </button>

            {repoDetails && (
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                {repoDetails.isPrivate ? 'Private' : 'Public'} Repo · Push Verified
              </span>
            )}
          </div>
        </div>

        {/* Repository Destination & Auto-Sync Settings */}
        <div className="p-4 bg-white border border-[#E5E5E1] space-y-4 shadow-2xs">
          <h4 className="font-serif font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#8C7355]" />
            Target Branch &amp; File Settings
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#767670] mb-1">
                Branch
              </label>
              <input
                type="text"
                value={config.branch}
                onChange={(e) => handleUpdateConfig({ branch: e.target.value })}
                placeholder="main"
                className="w-full bg-[#FAF9F7] border border-[#D5D5D0] px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#767670] mb-1 flex items-center gap-1">
                <FileCode className="w-3 h-3 text-[#8C7355]" />
                File Path
              </label>
              <input
                type="text"
                value={config.filePath}
                onChange={(e) => handleUpdateConfig({ filePath: e.target.value })}
                placeholder="wardrobe-backup.json"
                className="w-full bg-[#FAF9F7] border border-[#D5D5D0] px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#767670] mb-1">
              Custom Commit Message (Optional)
            </label>
            <input
              type="text"
              value={customCommitMessage}
              onChange={(e) => setCustomCommitMessage(e.target.value)}
              placeholder="e.g. Autumn Wardrobe Audit & Resale Refresh"
              className="w-full bg-[#FAF9F7] border border-[#D5D5D0] px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-[#E5E5E1] space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.stripImages !== false}
                onChange={(e) => handleUpdateConfig({ stripImages: e.target.checked })}
                className="w-4 h-4 text-[#8C7355] border-[#D5D5D0] rounded-none focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-[#1A1A1A]">
                  Strip Large Embedded Photos on GitHub Sync (Recommended)
                </span>
                <p className="text-[10px] text-[#767670] font-mono">
                  Removes bulky local base64 photo data so sync payloads stay under GitHub's 1MB API limit. External photo URLs remain intact, and existing local photos are safely preserved when pulling.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.autoSync}
                onChange={(e) => handleUpdateConfig({ autoSync: e.target.checked })}
                className="w-4 h-4 text-[#8C7355] border-[#D5D5D0] rounded-none focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-[#1A1A1A]">
                  Enable Automatic GitHub Cloud Backup
                </span>
                <p className="text-[10px] text-[#767670] font-mono">
                  Automatically schedules cloud synchronization when items or outfits are modified.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Guide Note */}
      <div className="p-3.5 bg-[#FAF9F7] border border-[#E5E5E1] text-xs font-sans text-[#5A5A55] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#8C7355] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#1A1A1A]">How GitHub Cloud Sync Works</p>
          <p className="text-[11px] leading-relaxed text-[#767670]">
            Your entire wardrobe state is exported into an immutable, human-readable JSON schema that GitHub commits directly to your branch. You get a full audit trail of every commit, diffs between wardrobe versions, and can pull your wardrobe state to any device at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
