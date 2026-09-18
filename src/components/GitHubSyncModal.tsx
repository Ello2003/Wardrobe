import React, { useState } from 'react';
import { Download, Github, Loader2, Upload, X, CheckCircle2 } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const KEY = 'wardrobe_github_sync_config';

const loadConfig = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { repository: 'Ello2003/Wardrobe', branch: 'main', path: 'wardrobe-data.json' };
};

export const GitHubSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { exportDataJSON, importDataJSON } = useWardrobe();
  const [config, setConfig] = useState(loadConfig);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const saveConfig = () => {
    try { localStorage.setItem(KEY, JSON.stringify(config)); } catch {}
  };

  const push = () => {
    setError(null);
    setMessage(null);
    const repo = config.repository.trim();
    const branch = config.branch.trim() || 'main';
    const path = config.path.trim() || 'wardrobe-data.json';
    if (repo.split('/').filter(Boolean).length !== 2) {
      setError('Enter the repository as owner/name.');
      return;
    }
    saveConfig();
    exportDataJSON();
    const uploadUrl = 'https://github.com/' + repo + '/upload/' + encodeURIComponent(branch) + '?filename=' + encodeURIComponent(path);
    window.open(uploadUrl, '_blank', 'noopener,noreferrer');
    setMessage('JSON backup downloaded and GitHub upload opened. Upload the downloaded file at the selected path.');
  };

  const pull = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      saveConfig();
      const parts = config.repository.trim().split('/').filter(Boolean);
      const branch = config.branch.trim() || 'main';
      const path = config.path.trim() || 'wardrobe-data.json';
      if (parts.length !== 2) throw new Error('Enter the repository as owner/name.');
      const rawUrl = 'https://raw.githubusercontent.com/' + parts[0] + '/' + parts[1] + '/' + encodeURIComponent(branch) + '/' + path.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(rawUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('GitHub Pull failed (' + response.status + '). Check repository, branch and file path.');
      const json = await response.text();
      const parsed = JSON.parse(json);
      if (parsed?.app !== 'Wardrobe & Style Studio' || !Array.isArray(parsed?.items)) {
        throw new Error('The selected file is not a Wardrobe & Style Studio backup.');
      }
      const result = importDataJSON(json, { mode: 'overwrite' });
      if (!result.success) throw new Error(result.message);
      setMessage('Pull complete. ' + result.message);
    } catch (err: any) {
      setError(err?.message || 'GitHub Pull failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="github-sync-title">
      <div className="w-full max-w-xl rounded-lg border border-[#E5E5E1] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E5E1] px-5 py-4">
          <div className="flex items-center gap-2"><Github className="h-5 w-5" /><h2 id="github-sync-title" className="font-serif text-lg font-bold">GitHub Sync</h2></div>
          <button type="button" onClick={onClose} aria-label="Close GitHub Sync" className="rounded-md p-1.5 text-[#767670] hover:bg-[#F3F2EE]"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <p className="rounded-md border border-[#E5E5E1] bg-[#F8F7F4] p-3 text-xs text-[#5A5A55]">
            Push creates a complete JSON backup and opens GitHub's upload page. Pull reads the public sync file and restores it into the app. This avoids putting repository credentials into the browser.
          </p>
          <label className="block"><span className="mb-1 block text-xs font-semibold">Repository</span><input value={config.repository} onChange={(e) => setConfig((p: any) => ({ ...p, repository: e.target.value }))} className="w-full rounded-md border border-[#D5D5D0] px-3 py-2 text-sm outline-none focus:border-[#8C7355]" placeholder="Ello2003/Wardrobe" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold">Branch</span><input value={config.branch} onChange={(e) => setConfig((p: any) => ({ ...p, branch: e.target.value }))} className="w-full rounded-md border border-[#D5D5D0] px-3 py-2 text-sm outline-none focus:border-[#8C7355]" /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold">Sync file</span><input value={config.path} onChange={(e) => setConfig((p: any) => ({ ...p, path: e.target.value }))} className="w-full rounded-md border border-[#D5D5D0] px-3 py-2 text-sm outline-none focus:border-[#8C7355]" /></label>
          </div>
          {message && <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4" />{message}</div>}
          {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#E5E5E1] px-3 py-2 text-xs font-medium hover:bg-[#F3F2EE]">Close</button>
            <button type="button" onClick={pull} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E5E1] px-3 py-2 text-xs font-semibold hover:bg-[#F3F2EE] disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Pull</button>
            <button type="button" onClick={push} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"><Upload className="h-3.5 w-3.5" />Push</button>
          </div>
        </div>
      </div>
    </div>
  );
};
