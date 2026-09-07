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
  lastSyncTime: null,
  lastSyncStatus: 'idle',
  lastSyncMessage: null,
  lastCommitSha: null,
};

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

    // 2. Prepare JSON string and Base64 encoding
    const sanitizedPayload = stripEmbeddedImages(databasePayload);
    const jsonString = JSON.stringify(sanitizedPayload, null, 2);
    // Use UTF-8 safe base64 encoding
    const base64Content = btoa(
      encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );

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
 * Pulls the latest backup from the configured GitHub repository
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

  try {
    const getFileUrl = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}?ref=${encodeURIComponent(cleanBranch)}`;
    const res = await fetch(getFileUrl, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, message: `Backup file "${cleanPath}" was not found on branch "${cleanBranch}".` };
      }
      return { success: false, message: `Failed to pull file from GitHub: HTTP ${res.status}` };
    }

    const fileMeta = await res.json();
    const base64Content = (fileMeta.content || '').replace(/\s/g, '');

    // Decode UTF-8 Base64
    const decodedStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64Content), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const parsedData = JSON.parse(decodedStr);
    return {
      success: true,
      message: `Successfully fetched backup from GitHub (${cleanRepo}/${cleanPath}).`,
      data: parsedData,
      sha: fileMeta.sha,
    };
  } catch (err: any) {
    console.error('GitHub pull error:', err);
    return { success: false, message: err?.message || 'Failed to pull or parse GitHub backup data.' };
  }
}
