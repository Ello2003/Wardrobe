/**
 * API Helper for Wardrobe & Style Studio
 * Handles safe fetching across local/server environments and static hosting (such as GitHub Pages).
 */

export const isStaticDeployment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.includes('github.io') ||
    window.location.protocol === 'file:' ||
    Boolean((window as any).__IS_STATIC_EXPORT__)
  );
};

export const isStaticHosting = isStaticDeployment;

export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const saved = localStorage.getItem('wardrobe_api_base_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export const setApiBaseUrl = (url: string): void => {
  if (typeof window === 'undefined') return;
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem('wardrobe_api_base_url');
    } else {
      localStorage.setItem('wardrobe_api_base_url', url.trim());
    }
  } catch (e) {
    // Ignore localStorage errors
  }
};

export interface ApiResponse<T = any> {
  success: boolean;
  status?: number;
  data?: T;
  error?: string;
  isStaticNotice?: boolean;
}

export async function safeApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const base = getApiBaseUrl();

  // If on static GitHub Pages with no external server configured, fail gracefully with a friendly notice
  if (!base && isStaticDeployment()) {
    return {
      success: false,
      isStaticNotice: true,
      error:
        'AI and auto-import features require a live backend server with a Gemini API key. On static hosting like GitHub Pages, API routes are unavailable. Please enter details manually or configure an external API endpoint in Settings.',
    };
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = base ? `${base}${cleanEndpoint}` : cleanEndpoint;

  try {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Returned HTML or plain text (e.g. 404 page on GitHub Pages)
      if (isStaticDeployment() || res.status === 404) {
        return {
          success: false,
          status: res.status,
          isStaticNotice: true,
          error:
            'AI endpoint is unavailable on this static hosting environment. You can add items manually or configure an API server in Settings.',
        };
      }
      const rawText = await res.text().catch(() => '');
      return {
        success: false,
        status: res.status,
        error: `Server returned non-JSON response (${res.status}): ${rawText.slice(0, 120)}`,
      };
    }

    const jsonData = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: jsonData.error || jsonData.message || `Request failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      status: res.status,
      data: jsonData as T,
    };
  } catch (err: any) {
    console.warn(`[SafeApiFetch] Error calling ${fullUrl}:`, err);
    return {
      success: false,
      error: err?.message || 'Network error occurred while contacting the service.',
    };
  }
}
