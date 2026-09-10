import { VersionChangeLog, WardrobeSnapshot } from '../types';

/**
 * Safely accesses localStorage without crashing if storage is disabled,
 * blocked in iframe, or throws a SecurityError.
 */
export function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Recursively strips oversized base64 data URIs (e.g. data:image/...) so payloads fit in localStorage's ~5MB quota.
 * Regular HTTP/HTTPS URLs are preserved completely. Protected with cycle and depth guards.
 */
export function stripLargeDataURIs<T>(
  value: T,
  maxLen = 300,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): T {
  if (value === null || value === undefined) return value;
  if (depth > 8) return value;

  try {
    if (typeof value === 'string') {
      if (value.startsWith('data:image/') || (value.length > maxLen && value.includes(';base64,'))) {
        return '[image omitted]' as unknown as T;
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => stripLargeDataURIs(item, maxLen, depth + 1, seen)) as unknown as T;
    }

    if (typeof value === 'object') {
      if (seen.has(value as object)) return value;
      seen.add(value as object);

      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(value as Record<string, any>)) {
        res[k] = stripLargeDataURIs(v, maxLen, depth + 1, seen);
      }
      return res as T;
    }
  } catch {
    return value;
  }

  return value;
}

/**
 * Compacts version change logs before persisting to localStorage:
 * 1. Retains full metadata for up to maxLogs entries.
 * 2. Only attaches snapshotData on the most recent maxSnapshotsToKeep entries.
 * 3. Strips all embedded base64 data URIs from snapshotData.
 */
export function compactLogsForStorage(
  logs: VersionChangeLog[],
  maxLogs = 35,
  maxSnapshotsToKeep = 3
): VersionChangeLog[] {
  if (!Array.isArray(logs)) return [];

  const sliced = logs.slice(0, maxLogs);

  return sliced.map((log, index) => {
    if (index < maxSnapshotsToKeep && log.snapshotData) {
      return {
        ...log,
        snapshotData: stripLargeDataURIs(log.snapshotData),
      };
    }
    // Remove heavy snapshotData from older logs, retaining all action metadata
    if (log.snapshotData) {
      const { snapshotData: _omitted, ...rest } = log;
      return rest;
    }
    return log;
  });
}

/**
 * Compacts snapshots before persisting to localStorage:
 * 1. Strips all embedded base64 data URIs from items and saleItems in snapshot data.
 * 2. Retains a maximum of maxManual manual snapshots and maxAuto auto checkpoints.
 */
export function compactSnapshotsForStorage(
  snapshots: WardrobeSnapshot[],
  maxManual = 5,
  maxAuto = 3
): WardrobeSnapshot[] {
  if (!Array.isArray(snapshots)) return [];

  const manual = snapshots.filter((s) => !s.isAuto).slice(0, maxManual);
  const auto = snapshots.filter((s) => s.isAuto).slice(0, maxAuto);

  const combined = [...manual, ...auto].sort((a, b) => {
    const tA = new Date(a.createdAt).getTime() || 0;
    const tB = new Date(b.createdAt).getTime() || 0;
    return tB - tA;
  });

  return combined.map((snap) => ({
    ...snap,
    data: stripLargeDataURIs(snap.data),
  }));
}

/**
 * Emergency quota pruner: immediately purges heavy snapshotData from localStorage logs
 * and trims snapshots to free space when a quota exceeded error is encountered.
 */
export function pruneLocalStorageEmergency(storageKeyPrefix: string): void {
  const storage = getSafeLocalStorage();
  if (!storage) return;

  try {
    // 1. Prune logs in storage
    const rawLogs = storage.getItem(`${storageKeyPrefix}_logs`);
    if (rawLogs) {
      try {
        const parsed = JSON.parse(rawLogs);
        if (Array.isArray(parsed)) {
          // Strip all snapshotData and keep latest 15 logs
          const minimal = parsed.slice(0, 15).map((l: any) => {
            const { snapshotData: _omitted, ...rest } = l;
            return rest;
          });
          storage.setItem(`${storageKeyPrefix}_logs`, JSON.stringify(minimal));
        }
      } catch {
        storage.removeItem(`${storageKeyPrefix}_logs`);
      }
    }

    // 2. Prune snapshots in storage
    const rawSnaps = storage.getItem(`${storageKeyPrefix}_snapshots`);
    if (rawSnaps) {
      try {
        const parsed = JSON.parse(rawSnaps);
        if (Array.isArray(parsed)) {
          // Keep only 2 manual snapshots, stripped
          const manualOnly = parsed
            .filter((s: any) => !s.isAuto)
            .slice(0, 2)
            .map((s: any) => ({
              ...s,
              data: stripLargeDataURIs(s.data),
            }));
          storage.setItem(`${storageKeyPrefix}_snapshots`, JSON.stringify(manualOnly));
        }
      } catch {
        storage.removeItem(`${storageKeyPrefix}_snapshots`);
      }
    }
  } catch (err) {
    console.warn('[StorageQuotaService] Emergency pruning warning:', err);
  }
}

/**
 * Safely saves logs to localStorage, applying progressive compaction and emergency pruning
 * if quota limits are reached.
 */
export function saveLogsSafely(logs: VersionChangeLog[], storageKeyPrefix: string): void {
  const storage = getSafeLocalStorage();
  if (!storage) return;

  const key = `${storageKeyPrefix}_logs`;
  const compacted = compactLogsForStorage(logs, 35, 3);

  try {
    storage.setItem(key, JSON.stringify(compacted));
  } catch (e: any) {
    const isQuota =
      e?.name === 'QuotaExceededError' ||
      e?.code === 22 ||
      e?.code === 1014 ||
      (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'));

    if (isQuota) {
      pruneLocalStorageEmergency(storageKeyPrefix);
      // Try super-lean: top 15 logs with NO snapshotData
      try {
        const leanLogs = logs.slice(0, 15).map((l) => {
          const { snapshotData: _omitted, ...rest } = l;
          return rest;
        });
        storage.setItem(key, JSON.stringify(leanLogs));
        return;
      } catch {
        // Fallback: top 5 logs
        try {
          const minimalLogs = logs.slice(0, 5).map((l) => {
            const { snapshotData: _omitted, ...rest } = l;
            return rest;
          });
          storage.setItem(key, JSON.stringify(minimalLogs));
          return;
        } catch {
          console.warn('[StorageQuotaService] Unable to save change logs due to storage constraints.');
          return;
        }
      }
    }

    console.warn('[StorageQuotaService] Could not persist logs:', e);
  }
}

/**
 * Safely saves snapshots to localStorage, applying progressive compaction and emergency pruning
 * if quota limits are reached.
 */
export function saveSnapshotsSafely(snapshots: WardrobeSnapshot[], storageKeyPrefix: string): void {
  const storage = getSafeLocalStorage();
  if (!storage) return;

  const key = `${storageKeyPrefix}_snapshots`;
  const compacted = compactSnapshotsForStorage(snapshots, 5, 2);

  try {
    storage.setItem(key, JSON.stringify(compacted));
  } catch (e: any) {
    const isQuota =
      e?.name === 'QuotaExceededError' ||
      e?.code === 22 ||
      e?.code === 1014 ||
      (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'));

    if (isQuota) {
      pruneLocalStorageEmergency(storageKeyPrefix);
      // Try lean: only 2 manual snapshots
      try {
        const lean = snapshots
          .filter((s) => !s.isAuto)
          .slice(0, 2)
          .map((s) => ({
            ...s,
            data: stripLargeDataURIs(s.data),
          }));
        storage.setItem(key, JSON.stringify(lean));
        return;
      } catch {
        // Fallback: latest snapshot only
        try {
          const minimal = snapshots.slice(0, 1).map((s) => ({
            ...s,
            data: stripLargeDataURIs(s.data),
          }));
          storage.setItem(key, JSON.stringify(minimal));
          return;
        } catch {
          console.warn('[StorageQuotaService] Unable to save snapshots due to storage constraints.');
          return;
        }
      }
    }

    console.warn('[StorageQuotaService] Could not persist snapshots:', e);
  }
}

/**
 * Generic safe save for core entities (items, outfits, shopping, sales, settings, categories, budget).
 * If quota is exceeded, triggers emergency pruning of non-critical historical logs and snapshots,
 * then retries the write.
 */
export function saveEntitySafely<T>(key: string, data: T, storageKeyPrefix: string): void {
  const storage = getSafeLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    const isQuota =
      e?.name === 'QuotaExceededError' ||
      e?.code === 22 ||
      e?.code === 1014 ||
      (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'));

    if (isQuota) {
      pruneLocalStorageEmergency(storageKeyPrefix);
      try {
        storage.setItem(key, JSON.stringify(data));
        return;
      } catch (retryErr) {
        console.warn(`[StorageQuotaService] Failed to persist entity ${key} after emergency pruning:`, retryErr);
        return;
      }
    }

    console.warn(`[StorageQuotaService] Error saving ${key}:`, e);
  }
}

/**
 * One-time startup sweep that detects and cleanses oversized logs and snapshots
 * stored from earlier sessions, restoring localStorage headroom immediately on boot.
 */
export function sanitizeStorageOnStartup(storageKeyPrefix: string): void {
  const storage = getSafeLocalStorage();
  if (!storage) return;

  try {
    const logsKey = `${storageKeyPrefix}_logs`;
    const rawLogs = storage.getItem(logsKey);
    if (rawLogs && (rawLogs.length > 100_000 || rawLogs.includes(';base64,'))) {
      try {
        const parsed = JSON.parse(rawLogs);
        if (Array.isArray(parsed)) {
          const compacted = compactLogsForStorage(parsed, 35, 3);
          storage.setItem(logsKey, JSON.stringify(compacted));
        }
      } catch {
        // Ignore parsing errors on startup
      }
    }

    const snapsKey = `${storageKeyPrefix}_snapshots`;
    const rawSnaps = storage.getItem(snapsKey);
    if (rawSnaps && (rawSnaps.length > 100_000 || rawSnaps.includes(';base64,'))) {
      try {
        const parsed = JSON.parse(rawSnaps);
        if (Array.isArray(parsed)) {
          const compacted = compactSnapshotsForStorage(parsed, 5, 2);
          storage.setItem(snapsKey, JSON.stringify(compacted));
        }
      } catch {
        // Ignore parsing errors on startup
      }
    }
  } catch (err) {
    console.warn('[StorageQuotaService] Startup sanitization warning:', err);
  }
}
