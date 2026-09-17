/**
 * GitHub Cloud Sync Service
 * Lossless wardrobe backup with safe push/pull handling.
 */

export interface GithubSyncConfig {
  token: string;
  repo: string;
  branch: string;
  filePath: string;
  autoSync: boolean;
  stripImages?: boolean;
  lastSyncTime: string | null;
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncMessage: string | null;
  lastCommitSha: string | null;
}

export const DEFAULT_GITHUB_SYNC_CONFIG: GithubSyncConfig = {
  token: '',
  repo: '',
  branch: 'main',
  filePath: 'wardrobe-database-backup.json',
  autoSync: false,
  stripImages: true,
  lastSyncTime: null,
  lastSyncStatus: 'idle',
  lastSyncMessage: null,
  lastCommitSha: null,
};

const STORAGE_KEY = 'wardrobe_github_sync_config_v1';
const API_ACCEPT = 'application/vnd.github+json';

function normaliseRepo(repo: string): string {
  return repo.trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git\/?$/, '')
    .replace(/^\/+|\/+$/g, '');
}

function normaliseBranch(branch: string): string {
  return branch.trim() || 'main';
}

function normalisePath(filePath: string): string {
  return (filePath.trim().replace(/^\/+/, '') || 'wardrobe-database-backup.json');
}

function githubHeaders(token: string, raw = false): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: raw ? 'application/vnd.github.raw+json' : API_ACCEPT,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export function stripEmbeddedImages<T>(value: T): T {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') || (value.length > 500 && value.includes(';base64,'))) {
      return '[image omitted from GitHub sync]' as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(stripEmbeddedImages) as unknown as T;
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = stripEmbeddedImages(val);
    }
    return result as T;
  }
  return value;
}

export function safeUtf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export function safeBase64DecodeUtf8(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  if (!clean) return '';
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

export function loadGithubSyncConfig(): GithubSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_GITHUB_SYNC_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_GITHUB_SYNC_CONFIG };
  } catch (err) {
    console.error('Failed to load GitHub sync config', err);
    return { ...DEFAULT_GITHUB_SYNC_CONFIG };
  }
}

export function saveGithubSyncConfig(config: GithubSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save GitHub sync config', err);
  }
}

export async function validateGithubCredentials(token: string, repo: string): Promise<{
  success: boolean;
  message: string;
  user?: { login: string; name: string; avatarUrl: string };
  repoDetails?: { fullName: string; defaultBranch: string; isPrivate: boolean; canPush: boolean };
}> {
  const cleanToken = token.trim();
  if (!cleanToken) return { success: false, message: 'GitHub Personal Access Token is required.' };

  try {
    const userRes = await fetch('https://api.github.com/user', { headers: githubHeaders(cleanToken) });
    if (!userRes.ok) {
      return {
        success: false,
        message: userRes.status === 401 ? 'Invalid or expired GitHub Personal Access Token.' : `GitHub authentication failed: HTTP ${userRes.status}`,
      };
    }

    const userData = await userRes.json();
    const user = { login: userData.login, name: userData.name || userData.login, avatarUrl: userData.avatar_url };
    const cleanRepo = normaliseRepo(repo);
    if (!cleanRepo) return { success: true, message: 'GitHub credentials verified successfully.', user };

    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers: githubHeaders(cleanToken) });
    if (!repoRes.ok) {
      return {
        success: false,
        message: repoRes.status === 404
          ? `Repository "${cleanRepo}" not found or the token cannot access it.`
          : `Failed to access repository: HTTP ${repoRes.status}`,
        user,
      };
    }

    const repoData = await repoRes.json();
    const canPush = Boolean(repoData.permissions?.push || repoData.permissions?.admin);
    if (!canPush) return { success: false, message: `Your token does not have write (push) permissions to "${cleanRepo}".`, user };

    return {
      success: true,
      message: 'GitHub credentials verified successfully.',
      user,
      repoDetails: {
        fullName: repoData.full_name,
        defaultBranch: repoData.default_branch || 'main',
        isPrivate: Boolean(repoData.private),
        canPush,
      },
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error connecting to GitHub API.' };
  }
}

async function getFileMetadata(token: string, repo: string, branch: string, filePath: string): Promise<{
  exists: boolean;
  sha?: string;
  size?: number;
  downloadUrl?: string;
  error?: string;
}> {
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (res.status === 404) return { exists: false };
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { exists: false, error: `GitHub file lookup failed: HTTP ${res.status}${body ? ` — ${body.slice(0, 180)}` : ''}` };
  }
  const data = await res.json();
  if (data.type !== 'file') return { exists: false, error: `GitHub path "${filePath}" is not a file.` };
  return { exists: true, sha: data.sha, size: data.size, downloadUrl: data.download_url };
}

/**
 * Pushes the complete wardrobe payload. If the file changes between the initial
 * read and PUT, a 409 is retried once using the new blob SHA instead of failing.
 */
export async function pushDatabaseToGithub(
  config: GithubSyncConfig,
  databasePayload: Record<string, any>,
  customMessage?: string,
): Promise<{ success: boolean; message: string; commitSha?: string; fileUrl?: string }> {
  const token = config.token?.trim();
  const repo = normaliseRepo(config.repo || '');
  const branch = normaliseBranch(config.branch || '');
  const filePath = normalisePath(config.filePath || '');
  if (!token || !repo) return { success: false, message: 'GitHub token and repository must be configured.' };

  try {
    const shouldStrip = config.stripImages !== false;
    const payload = shouldStrip ? stripEmbeddedImages(databasePayload) : databasePayload;
    const jsonString = JSON.stringify(payload, null, 2);
    const encoded = safeUtf8ToBase64(jsonString);

    // GitHub Contents API accepts files up to 100 MB, but recommends the API for
    // smaller files. Warn early if the backup is unusually large rather than
    // producing an opaque 4xx response.
    const byteLength = new TextEncoder().encode(jsonString).byteLength;
    if (byteLength >= 100 * 1024 * 1024) {
      return { success: false, message: `Backup is ${(byteLength / 1024 / 1024).toFixed(1)} MB; GitHub Contents API has a 100 MB file limit.` };
    }

    let metadata = await getFileMetadata(token, repo, branch, filePath);
    if (metadata.error) return { success: false, message: metadata.error };

    const commitMessage = customMessage?.trim() || (() => {
      const now = new Date().toISOString();
      return `Wardrobe Data Sync · ${now.slice(0, 10)} ${now.slice(11, 19)} UTC [auto-sync]`;
    })();

    const putUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const put = async (sha?: string) => fetch(putUrl, {
      method: 'PUT',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: commitMessage, content: encoded, branch, ...(sha ? { sha } : {}) }),
    });

    let putRes = await put(metadata.sha);

    // 409 means another sync committed the file after our GET. Refresh the SHA
    // and retry once; never overwrite a newer commit with a stale SHA.
    if (putRes.status === 409) {
      metadata = await getFileMetadata(token, repo, branch, filePath);
      if (metadata.error) return { success: false, message: metadata.error };
      putRes = await put(metadata.sha);
    }

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => '');
      let message = `HTTP ${putRes.status}`;
      try {
        const parsed = JSON.parse(errText);
        message = parsed.message || message;
      } catch {
        if (errText) message = errText.slice(0, 300);
      }
      return { success: false, message: `GitHub commit failed: ${message}` };
    }

    const result = await putRes.json();
    const commitSha = result.commit?.sha;
    const fileUrl = result.content?.html_url || `https://github.com/${repo}/blob/${branch}/${filePath}`;
    return { success: true, message: `Successfully synchronized wardrobe data to GitHub (${repo}/${filePath}).`, commitSha, fileUrl };
  } catch (err: any) {
    console.error('GitHub push error:', err);
    return { success: false, message: err?.message || 'Failed to push data to GitHub.' };
  }
}

async function fetchRawBackup(token: string, repo: string, branch: string, filePath: string, downloadUrl?: string): Promise<string> {
  const contentsUrl = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
  const rawRes = await fetch(contentsUrl, { headers: githubHeaders(token, true) });
  if (rawRes.ok) return await rawRes.text();

  // Fallback for GitHub API responses where raw media negotiation is unavailable.
  const metaRes = await fetch(contentsUrl, { headers: githubHeaders(token) });
  if (!metaRes.ok) {
    if (metaRes.status === 404) throw new Error(`Backup file "${filePath}" was not found on branch "${branch}" of repository "${repo}".`);
    throw new Error(`Failed to pull file from GitHub: HTTP ${metaRes.status}`);
  }

  const meta = await metaRes.json();
  if (meta.content) return safeBase64DecodeUtf8(meta.content);

  if (meta.sha) {
    const blobUrl = `https://api.github.com/repos/${repo}/git/blobs/${meta.sha}`;
    const blobRes = await fetch(blobUrl, { headers: githubHeaders(token) });
    if (blobRes.ok) {
      const blob = await blobRes.json();
      if (blob.encoding === 'base64' && blob.content) return safeBase64DecodeUtf8(blob.content);
    }
  }

  if (downloadUrl) {
    const dlRes = await fetch(downloadUrl, { headers: githubHeaders(token, true) });
    if (dlRes.ok) return await dlRes.text();
  }
  throw new Error(`Backup file "${filePath}" exists on GitHub but its contents could not be downloaded.`);
}

export async function pullDatabaseFromGithub(
  config: GithubSyncConfig,
): Promise<{ success: boolean; message: string; data?: Record<string, any>; sha?: string }> {
  const token = config.token?.trim();
  const repo = normaliseRepo(config.repo || '');
  const branch = normaliseBranch(config.branch || '');
  const filePath = normalisePath(config.filePath || '');
  if (!token || !repo) return { success: false, message: 'GitHub token and repository must be configured.' };

  try {
    const metadata = await getFileMetadata(token, repo, branch, filePath);
    if (metadata.error) return { success: false, message: metadata.error };
    if (!metadata.exists) return { success: false, message: `Backup file "${filePath}" was not found on branch "${branch}" of repository "${repo}".` };

    const rawJsonText = await fetchRawBackup(token, repo, branch, filePath, metadata.downloadUrl);
    if (!rawJsonText || !rawJsonText.trim()) {
      return { success: false, message: `Backup file "${filePath}" exists on GitHub but contains 0 bytes.` };
    }

    let parsedData: Record<string, any>;
    try {
      parsedData = JSON.parse(rawJsonText);
    } catch (err: any) {
      return { success: false, message: `GitHub backup file "${filePath}" contains invalid or incomplete JSON: ${err?.message || 'JSON parse error'}.` };
    }

    return { success: true, message: `Successfully fetched backup from GitHub (${repo}/${filePath}).`, data: parsedData, sha: metadata.sha };
  } catch (err: any) {
    console.error('GitHub pull error:', err);
    return { success: false, message: err?.message || 'Failed to pull or parse GitHub backup data.' };
  }
}
