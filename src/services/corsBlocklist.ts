/**
 * IDKstream — Domain-Level CORS Blocklist
 *
 * Maintains a persistent blocklist of domains that have been confirmed
 * CORS-incompatible. Checked BEFORE attempting headless validation
 * to avoid wasting network + CPU on known-bad hosts.
 *
 * Persisted to IndexedDB so the blocklist survives page reloads.
 */

import localforage from 'localforage';

const blocklistStore = localforage.createInstance({
  name: 'idkstream',
  storeName: 'cors_blocklist',
  description: 'Domains confirmed CORS-incompatible',
});

// In-memory set for O(1) lookups during hot validation loops
const blockedDomains = new Set<string>();

/**
 * Extracts the hostname from a URL string.
 */
function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Hydrates the in-memory blocklist from IndexedDB on startup.
 */
export async function loadBlocklist(): Promise<void> {
  try {
    blockedDomains.clear();
    await blocklistStore.iterate<boolean, void>((_value, key) => {
      blockedDomains.add(key);
    });
    console.log(`[IDKstream] CORS blocklist loaded: ${blockedDomains.size} blocked domains`);
  } catch (err) {
    console.error('[IDKstream] Failed to load CORS blocklist:', err);
  }
}

/**
 * Checks if a stream URL's domain is on the blocklist.
 */
export function isBlocked(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return false;
  return blockedDomains.has(hostname);
}

/**
 * Adds a domain to the CORS blocklist (both in-memory and IndexedDB).
 */
export async function blockDomain(url: string): Promise<void> {
  const hostname = extractHostname(url);
  if (!hostname) return;

  if (!blockedDomains.has(hostname)) {
    blockedDomains.add(hostname);
    await blocklistStore.setItem(hostname, true);
    console.log(`[IDKstream] CORS blocklist: added ${hostname} (total: ${blockedDomains.size})`);
  }
}

/**
 * Returns the current blocklist size (for debugging/telemetry HUD).
 */
export function getBlocklistSize(): number {
  return blockedDomains.size;
}
