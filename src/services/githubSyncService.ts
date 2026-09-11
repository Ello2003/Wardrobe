/**
 * GitHub Cloud Sync Service
 * Enables automatic and manual lossless synchronization of the wardrobe database to a GitHub repository.
 */

export interface GithubSyncConfig {
  token: string;
  repo: string; // "owner/repo" format
  branch: string; // e.g. "main"
  filePath: string; // e.g. "closet-backup.json"
  autoSync: boolean;
  stripImages?: boolean; // Strips large embedded data URI photos to fit under GitHub 1MB API limit
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

/**
 * Recursively strips oversized base64 data URIs so the JSON payload fits within GitHub's API payload limit (<1MB).
 * External URLs (e.g. https://...) are preserved untouched.
 */
export function stripEmbeddedImages<T>(value: T): T {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') || (value.length > 500 && value.includes(';base64,'))) {
      return '[image omitted from GitHub sync]' as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripEmbeddedImages(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
      result[key] = stripEmbeddedImages(val);
    }
    return result as T;
  }
  return value;
}

/**
 * Encodes a string to Base64 safely supporting full UTF-8 (emojis, currency signs, diacritics)
 * without exceeding JavaScript stack limits on large strings.
 */
export function safeUtf8ToBase64(str: string): string {
  try {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  } catch {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

/**
 * Decodes a Base64 string to a UTF-8 string safely handling non-ASCII and large strings.
 */
export function safeBase64DecodeUtf8(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  if (!clean) return '';
  try {
    const binary = atob(clean);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return decodeURIComponent(escape(atob(clean)));
  }
}

const STORAGE_KEY = 'wardrobe_github_sync_config_v1';

export function loadGithubSyncConfig(): GithubSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GITHUB_SYNC_CONFIG };
    return { ...DEFAULT_GITHUB_SYNC_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load GitHub sync config from localStorage', err);
    return { ...DEFAULT_GITHUB_SYNC_CONFIG };
  }
}

export function saveGithubSyncConfig(config: GithubSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save GitHub sync config to localStorage', err);
  }
}

/**
 * Validates a GitHub Personal Access Token and verifies repository permissions
 */
export async function validateGithubCredentials(token: string, repo: string): Promise<{
  success: boolean;
  message: string;
  user?: { login: string; name: string; avatarUrl: string };
  repoDetails?: { fullName: string; defaultBranch: string; isPrivate: boolean; canPush: boolean };
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { success: false, message: 'GitHub Personal Access Token is required.' };
  }

  try {
    // 1. Verify User Token
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { success: false, message: 'Invalid or expired GitHub Personal Access Token.' };
      }
      return { success: false, message: `GitHub authentication failed: HTTP ${userRes.status}` };
    }

    const userData = await userRes.json();

    // 2. If repo specified, check repo access and write permissions
    const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    let repoDetails = undefined;

    if (cleanRepo) {
      const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          return {
            success: false,
            message: `Repository "${cleanRepo}" not found. Ensure the repository exists and your token has "repo" scope.`,
            user: { login: userData.login, name: userData.name || userData.login, avatarUrl: userData.avatar_url },
          };
        }
        return {
          success: false,
          message: `Failed to access repository: HTTP ${repoRes.status}`,
          user: { login: userData.login, name: userData.name || userData.login, avatarUrl: userData.avatar_url },
        };
      }

      const repoData = await repoRes.json();
      const canPush = Boolean(repoData.permissions?.push || repoData.permissions?.admin);

      if (!canPush) {
        return {
          success: false,
          message: `Your token does not have write (push) permissions to "${cleanRepo}".`,
          user: { login: userData.login, name: userData.name || userData.login, avatarUrl: userData.avatar_url },
        };
      }

      repoDetails = {
        fullName: repoData.full_name,
        defaultBranch: repoData.default_branch || 'main',
        isPrivate: repoData.private,
        canPush,
      };
    }

    return {
      success: true,
      message: 'GitHub credentials verified successfully.',
      user: {
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
      },
      repoDetails,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error connecting to GitHub API.' };
  }
}

/**
 * Pushes the full wardrobe database payload to GitHub
 */
export async function pushDatabaseToGithub(
  config: GithubSyncConfig,
  databasePayload: Record<string, any>,
  customMessage?: string
): Promise<{
  success: boolean;
  message: string;
  commitSha?: string;
  fileUrl?: string;
}> {
  const { token, repo, branch, filePath } = config;

  if (!token || !repo) {
    return { success: false, message: 'GitHub token and repository must be configured.' };
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const cleanBranch = branch.trim() || 'main';
  const cleanPath = filePath.trim().replace(/^\//, '') || 'wardrobe-backup.json';

  try {
    // 1. Check if the file already exists on GitHub to obtain its current blob SHA (required by GitHub API for updates)
    let currentSha: string | undefined = undefined;
    const getFileUrl = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}?ref=${encodeURIComponent(cleanBranch)}`;

    const checkRes = await fetch(getFileUrl, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (checkRes.ok) {
      const fileMeta = await checkRes.json();
      currentSha = fileMeta.sha;
    }

    // 2. Prepare JSON string and Base64 encoding (strip oversized embedded base64 photos if enabled)
    const shouldStrip = config.stripImages !== false;
    const sanitizedPayload = shouldStrip ? stripEmbeddedImages(databasePayload) : databasePayload;
    const jsonString = JSON.stringify(sanitizedPayload, null, 2);
    // Use UTF-8 and memory-safe base64 encoding
    const base64Content = safeUtf8ToBase64(jsonString);

    const timestampStr = new Date().toISOString();
    const commitMessage =
      customMessage ||
      `Wardrobe Data Sync · ${timestampStr.slice(0, 10)} ${timestampStr.slice(11, 19)} UTC [auto-sync]`;

    // 3. Put File Contents
    const putUrl = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`;
    const putBody: Record<string, any> = {
      message: commitMessage,
      content: base64Content,
      branch: cleanBranch,
    };
    if (currentSha) {
      putBody.sha = currentSha;
    }

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return {
        success: false,
        message: `GitHub commit failed: ${errData.message || `HTTP ${putRes.status}`}`,
      };
    }

    const putData = await putRes.json();
    const commitSha = putData.commit?.sha || putData.content?.sha;
    const fileHtmlUrl = putData.content?.html_url || `https://github.com/${cleanRepo}/blob/${cleanBranch}/${cleanPath}`;

    return {
      success: true,
      message: `Successfully synchronized wardrobe data to GitHub (${cleanRepo}/${cleanPath})!`,
      commitSha,
      fileUrl: fileHtmlUrl,
    };
  } catch (err: any) {
    console.error('GitHub push error:', err);
    return { success: false, message: err?.message || 'Failed to push data to GitHub.' };
  }
}

/**
 * Pulls the latest backup from the configured GitHub repository.
 * Robust against GitHub's 1MB API limit, empty content responses,
 * and base64 parsing EOF truncations.
 */
export async function pullDatabaseFromGithub(
  config: GithubSyncConfig
): Promise<{
  success: boolean;
  message: string;
  data?: Record<string, any>;
  sha?: string;
}> {
  const { token, repo, branch, filePath } = config;

  if (!token || !repo) {
    return { success: false, message: 'GitHub token and repository must be configured.' };
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const cleanBranch = branch.trim() || 'main';
  const cleanPath = filePath.trim().replace(/^\//, '') || 'wardrobe-backup.json';

  const authHeader = `Bearer ${token.trim()}`;
  const getFileUrl = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}?ref=${encodeURIComponent(cleanBranch)}`;

  try {
    let rawJsonText: string | null = null;
    let fileSha: string | undefined = undefined;

    // Strategy 1: Direct Raw Contents Fetch (application/vnd.github.v3.raw)
    // This allows downloading raw file contents up to 100MB directly without base64 truncation or 1MB limits.
    try {
      const rawRes = await fetch(getFileUrl, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/vnd.github.v3.raw',
        },
      });

      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text && text.trim().length > 0) {
          rawJsonText = text;
          fileSha = rawRes.headers.get('etag')?.replace(/"/g, '') || undefined;
        }
      } else if (rawRes.status === 404) {
        return {
          success: false,
          message: `Backup file "${cleanPath}" was not found on branch "${cleanBranch}" of repository "${cleanRepo}".`,
        };
      }
    } catch (rawErr) {
      console.warn('Direct raw fetch from GitHub contents API encountered an issue, trying metadata API fallback:', rawErr);
    }

    // Strategy 2: Contents Metadata API + Git Blobs API fallback (handles >1MB files where contents.content is empty)
    if (!rawJsonText) {
      const metaRes = await fetch(getFileUrl, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!metaRes.ok) {
        if (metaRes.status === 404) {
          return {
            success: false,
            message: `Backup file "${cleanPath}" was not found on branch "${cleanBranch}" of repository "${cleanRepo}".`,
          };
        }
        return { success: false, message: `Failed to pull file from GitHub: HTTP ${metaRes.status}` };
      }

      const fileMeta = await metaRes.json();
      fileSha = fileMeta.sha;

      // If content is embedded directly in file metadata (< 1MB)
      if (fileMeta.content && typeof fileMeta.content === 'string' && fileMeta.content.trim().length > 0) {
        rawJsonText = safeBase64DecodeUtf8(fileMeta.content);
      }
      // If content is empty because file >= 1MB, fetch from Git Blobs API (supports up to 100MB)
      else if (fileMeta.sha) {
        const blobUrl = `https://api.github.com/repos/${cleanRepo}/git/blobs/${fileMeta.sha}`;

        // Try raw blob first
        const rawBlobRes = await fetch(blobUrl, {
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3.raw',
          },
        });

        if (rawBlobRes.ok) {
          const blobText = await rawBlobRes.text();
          if (blobText && blobText.trim().length > 0) {
            rawJsonText = blobText;
          }
        }

        // Try JSON blob (contains base64 content up to 100MB)
        if (!rawJsonText) {
          const jsonBlobRes = await fetch(blobUrl, {
            headers: {
              Authorization: authHeader,
              Accept: 'application/vnd.github.v3+json',
            },
          });
          if (jsonBlobRes.ok) {
            const blobMeta = await jsonBlobRes.json();
            if (blobMeta.content) {
              rawJsonText = safeBase64DecodeUtf8(blobMeta.content);
            }
          }
        }

        // Try download_url as third fallback
        if (!rawJsonText && fileMeta.download_url) {
          const dlRes = await fetch(fileMeta.download_url, {
            headers: {
              Authorization: authHeader,
            },
          });
          if (dlRes.ok) {
            const dlText = await dlRes.text();
            if (dlText && dlText.trim().length > 0) {
              rawJsonText = dlText;
            }
          }
        }
      }
    }

    // Explicit check for empty content to prevent "JSON Parse error: Unexpected EOF"
    if (!rawJsonText || rawJsonText.trim().length === 0) {
      return {
        success: false,
        message: `Backup file "${cleanPath}" exists on GitHub but contains 0 bytes (empty content). Please verify your GitHub repository or commit a fresh sync.`,
      };
    }

    // Safely parse JSON with rich diagnostic reporting
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawJsonText);
    } catch (parseErr: any) {
      console.error('Failed to parse pulled GitHub JSON:', parseErr, rawJsonText.slice(0, 200));
      return {
        success: false,
        message: `GitHub backup file "${cleanPath}" is incomplete or corrupted: ${parseErr?.message || 'JSON Parse error: Unexpected EOF'}. Ensure the repository file has valid JSON.`,
      };
    }

    return {
      success: true,
      message: `Successfully fetched and decoded backup from GitHub (${cleanRepo}/${cleanPath}).`,
      data: parsedData,
      sha: fileSha,
    };
  } catch (err: any) {
    console.error('GitHub pull error:', err);
    return { success: false, message: err?.message || 'Failed to pull or parse GitHub backup data.' };
  }
}
