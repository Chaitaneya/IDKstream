import localforage from 'localforage';
import type { StreamHealth } from '../types';

export const healthStore = localforage.createInstance({
  name: 'idkstream',
  storeName: 'health_telemetry',
  description: 'IPTV stream validation and playback telemetry',
});

// Cache telemetry records in memory for high performance during stream selection
const telemetryCache = new Map<string, StreamHealth>();

/**
 * Generates a SHA-256 hash of the stream URL to use as a unique ID.
 */
export async function hashUrl(url: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash in case Web Crypto is unavailable (e.g. non-secure contexts)
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return 'fb_' + Math.abs(hash).toString(16);
  }
}

/**
 * Hydrates the in-memory telemetry cache from IndexedDB on startup.
 */
export async function initTelemetry(): Promise<void> {
  try {
    telemetryCache.clear();
    await healthStore.iterate<StreamHealth, void>((value, key) => {
      telemetryCache.set(key, value);
    });
    console.log(`[IDKstream] Telemetry cache loaded with ${telemetryCache.size} records`);
  } catch (err) {
    console.error('[IDKstream] Telemetry hydration failed:', err);
  }
}

/**
 * Retrieves a stream's health telemetry.
 */
export function getStreamHealthSync(streamId: string): StreamHealth {
  const cached = telemetryCache.get(streamId);
  if (cached) return cached;

  return {
    streamId,
    healthScore: 60, // Default starting health score (neutral-positive)
    lastValidatedAt: 0,
    successfulPlays: 0,
    failedPlays: 0,
    averageWatchTime: 0,
    corsCompatible: true, // Default to true until proven otherwise
    fragmentVerified: false, // Unverified until dual-gate validation passes
    lastError: null,
  };
}

/**
 * Saves a health telemetry record to IndexedDB and the cache.
 */
export async function saveStreamHealth(health: StreamHealth): Promise<void> {
  telemetryCache.set(health.streamId, health);
  await healthStore.setItem(health.streamId, health);
}

/**
 * Records the outcome of a stream connection/validation attempt.
 */
export async function recordAttempt(
  url: string,
  success: boolean,
  errorType: string | null = null,
  fragVerified: boolean = false
): Promise<StreamHealth> {
  const streamId = await hashUrl(url);
  const record = getStreamHealthSync(streamId);

  record.lastValidatedAt = Date.now();

  if (success) {
    record.successfulPlays += 1;
    record.corsCompatible = true;
    record.fragmentVerified = fragVerified;
    record.lastError = null;
    // Boost more aggressively if fragment-verified (dual-gate pass)
    record.healthScore = Math.min(100, record.healthScore + (fragVerified ? 20 : 10));
  } else {
    record.failedPlays += 1;
    record.lastError = errorType || 'unknownError';
    // Penalize score on failure
    record.healthScore = Math.max(0, record.healthScore - 25);
    
    // Explicit CORS failure detection
    if (errorType === 'cors' || errorType === 'networkError') {
      record.corsCompatible = false;
      record.fragmentVerified = false;
    }
    // Fragment-level CORS failure
    if (errorType === 'fragCors') {
      record.corsCompatible = false;
      record.fragmentVerified = false;
    }
  }

  await saveStreamHealth(record);
  return record;
}
