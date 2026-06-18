import Hls from 'hls.js';
import { useIDKStreamStore } from '../store/useIDKStreamStore';
import { getStreamHealthSync, recordAttempt, hashUrl } from './telemetryService';
import { isBlocked, blockDomain } from './corsBlocklist';
import type { IPTVChannel } from '../types';

let isLoopRunning = false;
let currentValidatorHls: Hls | null = null;
let currentValidatorVideo: HTMLVideoElement | null = null;

/**
 * Validates a single HLS stream using DUAL-GATE validation:
 *
 *   Gate 1: MANIFEST_PARSED — proves the manifest is accessible via CORS
 *   Gate 2: FRAG_LOADED — proves at least one video fragment is accessible
 *
 * Both gates must pass for the stream to be considered valid.
 * This eliminates the class of bugs where manifests load fine but
 * fragment requests are blocked by CORS/geo-IP/origin restrictions.
 */
export function validateStream(stream: IPTVChannel, timeoutMs = 5000): Promise<boolean> {
  // Pre-check: skip if this domain is already on the CORS blocklist
  if (isBlocked(stream.url)) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let resolved = false;
    let manifestPassed = false;

    // Create a hidden video element
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';
    document.body.appendChild(video);
    currentValidatorVideo = video;

    let hls: Hls | null = null;

    const cleanup = () => {
      if (hls) {
        hls.destroy();
        if (currentValidatorHls === hls) {
          currentValidatorHls = null;
        }
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      if (currentValidatorVideo === video) {
        currentValidatorVideo = null;
      }
    };

    const done = async (success: boolean, errorType: string | null = null, fragVerified = false) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      
      // Record telemetry data in IndexedDB
      await recordAttempt(stream.url, success, errorType, fragVerified);

      // If it was a CORS/network failure, blocklist the domain
      if (!success && (errorType === 'cors' || errorType === 'fragCors' || errorType === 'networkError')) {
        await blockDomain(stream.url);
      }

      resolve(success);
    };

    // Timeout fallback
    const timer = setTimeout(() => {
      // If manifest passed but fragment timed out, it's a fragCors issue
      if (manifestPassed) {
        done(false, 'fragTimeout');
      } else {
        done(false, 'timeout');
      }
    }, timeoutMs);

    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 1,
        enableWorker: false, // Keep background light
        manifestLoadingTimeOut: timeoutMs - 1000,
        fragLoadingTimeOut: timeoutMs - 1000,
        manifestLoadingMaxRetry: 0,
        fragLoadingMaxRetry: 0,
      });
      currentValidatorHls = hls;

      hls.loadSource(stream.url);
      hls.attachMedia(video);

      // Gate 1: Manifest parsed — CORS-accessible manifest
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        manifestPassed = true;
        // Don't resolve yet — wait for Gate 2
        // Start playback to trigger fragment loading
        video.play().catch(() => {
          // Autoplay may be blocked, but fragment loading should still proceed
        });
      });

      // Gate 2: Fragment loaded — CORS-accessible fragments
      hls.on(Hls.Events.FRAG_LOADED, () => {
        clearTimeout(timer);
        done(true, null, true); // Both gates passed, fragment verified
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        let errCode: string = 'unknown';
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          const responseCode = data.response?.code;

          // Determine if this was a manifest or fragment CORS failure
          if (manifestPassed) {
            // We're past the manifest — this is a fragment-level failure
            errCode = 'fragCors';
          } else {
            errCode = (responseCode === 0 || responseCode === 403) ? 'cors' : 'networkError';
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          errCode = 'mediaError';
        }

        // Only abort on fatal errors or network errors
        if (data.fatal || data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          clearTimeout(timer);
          done(false, errCode);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari / iOS HLS
      video.src = stream.url;

      const onLoadedMetadata = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
        done(true, null, true);
      };

      const onError = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
        done(false, 'nativeError');
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
    } else {
      done(false, 'notSupported');
    }
  });
}

/**
 * Selects a candidate stream using weighted random selection based on health scores and CORS profiles.
 */
async function selectCandidate(channels: IPTVChannel[], currentQueue: IPTVChannel[], activeStream: IPTVChannel | null): Promise<IPTVChannel | null> {
  if (channels.length === 0) return null;

  // Filter out channels currently queued or actively playing
  const excludeIds = new Set([
    ...currentQueue.map((c) => c.id),
    ...(activeStream ? [activeStream.id] : []),
  ]);

  const candidates = channels.filter((c) => !excludeIds.has(c.id));
  if (candidates.length === 0) return null;

  // Pre-filter: remove any candidates whose domains are on the CORS blocklist
  const corsFiltered = candidates.filter((c) => !isBlocked(c.url));
  const pool = corsFiltered.length > 0 ? corsFiltered : candidates;

  // Compute weights for each candidate
  const weights = new Array<number>(pool.length);
  let totalWeight = 0;

  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[i];
    const streamId = await hashUrl(candidate.url);
    const health = getStreamHealthSync(streamId);

    let weight = 50; // default weight for untested streams

    if (!health.corsCompatible) {
      weight = 0; // Skip completely if confirmed CORS incompatible
    } else if (health.lastValidatedAt > 0) {
      // Fragment-verified streams get a significant boost
      const fragBonus = health.fragmentVerified ? 20 : 0;
      // Scale weight directly with health score (e.g. reliable ones get prioritized)
      // Cap minimum weight at 5 to allow occasional retries of flaky streams
      weight = Math.max(5, health.healthScore + fragBonus);
    }

    weights[i] = weight;
    totalWeight += weight;
  }

  // If all weights are 0, fallback to uniform random among non-blocklisted
  if (totalWeight === 0) {
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  // Weighted random selection
  let r = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      return pool[i];
    }
  }

  return pool[pool.length - 1];
}

/**
 * Starts the validation background loop. It fills the pre-warmed queue up to 20 items.
 */
export async function startPreWarmingLoop() {
  if (isLoopRunning) return;
  isLoopRunning = true;
  console.log('[IDKstream] Background stream pre-warming loop started (dual-gate validation)');

  while (isLoopRunning) {
    const store = useIDKStreamStore.getState();
    const { channels, validatedQueue, currentStream, pushToQueue, sharedPlaylist } = store;
    const pool = sharedPlaylist ? sharedPlaylist.streams : channels;

    // Target queue size is between 10 (minimum) and 20 (maximum buffer)
    if (validatedQueue.length < 20 && pool.length > 0) {
      const candidate = await selectCandidate(pool, validatedQueue, currentStream);
      if (candidate) {
        // Run silent dual-gate validation
        const isValid = await validateStream(candidate);
        if (isValid) {
          // Push to state queue
          pushToQueue(candidate);
          console.log(`[IDKstream] Pre-warmed & added to queue: ${candidate.name} (Queue size: ${validatedQueue.length + 1})`);
        }
      }
      // Sleep 600ms before validating next candidate to not clog network
      await new Promise((resolve) => setTimeout(resolve, 600));
    } else {
      // If queue is full, sleep for 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

/**
 * Stops the validation background loop.
 */
export function stopPreWarmingLoop() {
  isLoopRunning = false;
  if (currentValidatorHls) {
    currentValidatorHls.destroy();
    currentValidatorHls = null;
  }
  if (currentValidatorVideo && currentValidatorVideo.parentNode) {
    currentValidatorVideo.parentNode.removeChild(currentValidatorVideo);
    currentValidatorVideo = null;
  }
  console.log('[IDKstream] Background stream pre-warming loop stopped');
}
