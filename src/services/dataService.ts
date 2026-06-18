/**
 * IDKstream — Data Ingestion Pipeline
 *
 * Fetches channels.json + streams.json from iptv-org,
 * joins them, sanitizes (removes NSFW/closed), filters to HLS-only,
 * and caches the result in IndexedDB via localforage.
 */

/**
 * fetches json from 2 urls and combines them together and filters 
 * and saves them to the browser's local hard drive using localforage (IndexedDB).
 * then loads from cache if not stale.
 */
import localforage from 'localforage';
import type { IPTVRawChannel, IPTVRawStream, IPTVChannel } from '../types';

// ── localforage stores ────────────────────────────────
const channelStore = localforage.createInstance({
  name: 'idkstream',
  storeName: 'channels',
  description: 'Cached, sanitized iptv-org channel data',
});

const metaStore = localforage.createInstance({
  name: 'idkstream',
  storeName: 'meta',
  description: 'Metadata for cache freshness tracking',
});

// ── Constants ─────────────────────────────────────────
const CHANNELS_API = 'https://iptv-org.github.io/api/channels.json';
const STREAMS_API = 'https://iptv-org.github.io/api/streams.json';
const CACHE_KEY = 'sanitized_channels';
const CACHE_TIMESTAMP_KEY = 'last_fetched_at';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Checks if the cached data is still fresh (< 24 hours old).
 */
async function isCacheFresh(): Promise<boolean> {
  try {
    const lastFetched = await metaStore.getItem<number>(CACHE_TIMESTAMP_KEY);
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Loads channels from IndexedDB cache.
 * Returns null if cache is empty or stale.
 */
async function loadFromCache(): Promise<IPTVChannel[] | null> {
  try {
    const fresh = await isCacheFresh();
    if (!fresh) return null;
    const cached = await channelStore.getItem<IPTVChannel[]>(CACHE_KEY);
    return cached && cached.length > 0 ? cached : null;
  } catch {
    return null;
  }
}

/**
 * Saves sanitized channels to IndexedDB cache.
 */
async function saveToCache(channels: IPTVChannel[]): Promise<void> {
  await channelStore.setItem(CACHE_KEY, channels);
  await metaStore.setItem(CACHE_TIMESTAMP_KEY, Date.now());
}

/**
 * Fetches raw data from iptv-org API, joins channels+streams,
 * sanitizes, and filters to HLS-compatible streams only.
 */
async function fetchAndSanitize(): Promise<IPTVChannel[]> {
  // Fetch both endpoints in parallel
  const [channelsRes, streamsRes] = await Promise.all([
    fetch(CHANNELS_API),
    fetch(STREAMS_API),
  ]);

  if (!channelsRes.ok) {
    throw new Error(`Failed to fetch channels: ${channelsRes.status} ${channelsRes.statusText}`);
  }
  if (!streamsRes.ok) {
    throw new Error(`Failed to fetch streams: ${streamsRes.status} ${streamsRes.statusText}`);
  }

  const rawChannels: IPTVRawChannel[] = await channelsRes.json();
  const rawStreams: IPTVRawStream[] = await streamsRes.json();

  // Build a lookup map: channel.id → channel metadata
  const channelMap = new Map<string, IPTVRawChannel>();
  for (const ch of rawChannels) {
    channelMap.set(ch.id, ch);
  }

  // Join streams to channels, sanitize, and filter
  const sanitized: IPTVChannel[] = [];

  for (const stream of rawStreams) {
    const channel = channelMap.get(stream.channel);

    // Skip if no matching channel metadata
    if (!channel) continue;

    // Skip NSFW content
    if (channel.is_nsfw) continue;

    // Skip closed channels
    if (channel.closed) continue;

    // Filter to HLS streams only (.m3u8)
    if (!stream.url.includes('.m3u8')) continue;

    // Skip empty URLs
    if (!stream.url.trim()) continue;

    sanitized.push({
      id: channel.id,
      name: channel.name,
      url: stream.url,
      country: channel.country || 'Unknown',
      language: 'Unknown', // streams.json doesn't carry language; will enrich later if needed
      categories: channel.categories || [],
    });
  }

  return sanitized;
}

/**
 * Main entry point: loads channels from cache or fetches fresh.
 * Returns the sanitized channel array.
 */
export async function loadChannels(): Promise<IPTVChannel[]> {
  // Try cache first
  const cached = await loadFromCache();
  if (cached) {
    console.log(`[IDKstream] Loaded ${cached.length} channels from IndexedDB cache`);
    return cached;
  }

  // Fetch fresh data
  console.log('[IDKstream] Cache miss — fetching from iptv-org API...');
  const channels = await fetchAndSanitize();

  // Persist to cache
  await saveToCache(channels);
  console.log(`[IDKstream] Cached ${channels.length} sanitized HLS channels to IndexedDB`);

  return channels;
}

/**
 * Forces a fresh fetch regardless of cache state.
 * Useful for manual refresh actions.
 */
export async function forceRefreshChannels(): Promise<IPTVChannel[]> {
  const channels = await fetchAndSanitize();
  await saveToCache(channels);
  console.log(`[IDKstream] Force-refreshed: ${channels.length} channels cached`);
  return channels;
}

// Export store instances for use in health scoring (Phase 4)
export { channelStore, metaStore };
