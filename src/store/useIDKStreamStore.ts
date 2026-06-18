/**
 * IDKstream — Zustand State Store
 *
 * Central state management for playback, circuit breaker,
 * the pre-warmed queue, auth, bookmarks, and playlists.
 *
 * Auth and bookmark operations delegate to Supabase services.
 * Playlist CRUD delegates to the playlist service.
 */

import { create } from 'zustand';
import type { IDKStreamState, IPTVChannel, CircuitState, UserProfile, Playlist } from '../types';
import { recordAttempt } from '../services/telemetryService';
import { signInWithGoogle, signOut as authSignOut } from '../services/authService';
import { fetchBookmarks, addBookmark, removeBookmark } from '../services/bookmarkService';
import {
  fetchUserPlaylists,
  createPlaylist as createPlaylistAPI,
  deletePlaylist as deletePlaylistAPI,
  generateShareCode,
} from '../services/playlistService';

export const SAFE_STREAMS: IPTVChannel[] = [
  {
    id: 'dw-english',
    name: 'Deutsche Welle English',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    country: 'DE',
    language: 'English',
    categories: ['News'],
  },
  {
    id: 'france-24-english',
    name: 'France 24 English',
    url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8',
    country: 'FR',
    language: 'English',
    categories: ['News'],
  },
  {
    id: 'al-jazeera-english',
    name: 'Al Jazeera English',
    url: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8',
    country: 'QA',
    language: 'English',
    categories: ['News'],
  },
  {
    id: 'cgtn-english',
    name: 'CGTN',
    url: 'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8',
    country: 'CN',
    language: 'English',
    categories: ['News'],
  },
  {
    id: 'arirang-tv',
    name: 'Arirang TV',
    url: 'https://amdlive-ch01-ctnd-com.akamaized.net/ch01/playlist.m3u8',
    country: 'KR',
    language: 'English',
    categories: ['General'],
  },
  {
    id: 'rt-documentary',
    name: 'RT Documentary',
    url: 'https://rt-doc.secure2.footprint.net/1103-hls/index.m3u8',
    country: 'RU',
    language: 'English',
    categories: ['Documentary'],
  },
];

export const useIDKStreamStore = create<IDKStreamState>((set, get) => ({
  // ── Data Layer ──────────────────────────────────────
  channels: [],
  isDataLoaded: false,
  isDataLoading: false,
  dataError: null,

  // ── Playback ────────────────────────────────────────
  currentStream: null,
  isPlaying: false,
  volume: 0.8, // default to a healthy 80% volume
  isMuted: false,
  isSurfing: true,

  // ── Circuit Breaker ─────────────────────────────────
  circuitState: 'CLOSED' as CircuitState,
  recentErrors: [],

  // ── Pre-warmed Queue ────────────────────────────────
  validatedQueue: [],
  queueSize: 0,

  // ── Auth & Bookmarks ────────────────────────────────
  user: null,
  bookmarks: [],

  // ── Playlists ───────────────────────────────────────
  playlists: [],
  sharedPlaylist: null,

  // ── Actions ─────────────────────────────────────────
  setChannels: (channels: IPTVChannel[]) =>
    set({ channels, isDataLoaded: true, isDataLoading: false, dataError: null }),

  setDataLoaded: (loaded: boolean) =>
    set({ isDataLoaded: loaded }),

  setDataLoading: (loading: boolean) =>
    set({ isDataLoading: loading }),

  setDataError: (error: string | null) =>
    set({ dataError: error, isDataLoading: false }),

  setCurrentStream: (stream: IPTVChannel | null) =>
    set({ currentStream: stream, isPlaying: stream !== null, isSurfing: false }),

  setIsPlaying: (playing: boolean) =>
    set({ isPlaying: playing }),

  setVolume: (volume: number) =>
    set({ volume }),

  setIsMuted: (isMuted: boolean) =>
    set({ isMuted }),

  setIsSurfing: (isSurfing: boolean) =>
    set({ isSurfing }),

  setCircuitState: (state: CircuitState) =>
    set({ circuitState: state }),

  pushError: (timestamp: number) => {
    const { recentErrors, circuitState, playNextRandomStream, currentStream } = get();

    // 1. Penalize the current failing stream in telemetry
    if (currentStream) {
      recordAttempt(currentStream.url, false, 'playbackError');
    }

    const fiveSecondsAgo = Date.now() - 5000;
    const pruned = [...recentErrors, timestamp].filter((t) => t > fiveSecondsAgo);

    if (circuitState === 'CLOSED' && pruned.length >= 2) {
      console.warn('[IDKstream] Circuit Breaker: Tripped to OPEN state! Suspending playback.');
      set({ circuitState: 'OPEN', recentErrors: [], currentStream: null, isPlaying: false });

      // Automatically transition to HALF-OPEN recovery mode after 3 seconds
      setTimeout(() => {
        const state = useIDKStreamStore.getState();
        if (state.circuitState === 'OPEN') {
          console.log('[IDKstream] Circuit Breaker: Transitioning to HALF-OPEN. Playing safe fallback stream.');
          const safeStream = SAFE_STREAMS[0];
          set({
            circuitState: 'HALF_OPEN',
            currentStream: safeStream,
            isPlaying: true,
            recentErrors: [],
          });

          // Wait 10 seconds of flawless playback to restore CLOSED state
          setTimeout(() => {
            const finalState = useIDKStreamStore.getState();
            if (finalState.circuitState === 'HALF_OPEN') {
              console.log('[IDKstream] Circuit Breaker: Flawless recovery completed. Resetting to CLOSED state.');
              set({ circuitState: 'CLOSED', recentErrors: [] });
            }
          }, 10000);
        }
      }, 3000);
    } else if (circuitState === 'HALF_OPEN') {
      // If playback fails in HALF_OPEN, trip the breaker back to OPEN
      console.warn('[IDKstream] Circuit Breaker: Failure during HALF-OPEN! Tripping back to OPEN state.');
      set({ circuitState: 'OPEN', recentErrors: [], currentStream: null, isPlaying: false });

      setTimeout(() => {
        const state = useIDKStreamStore.getState();
        if (state.circuitState === 'OPEN') {
          // Switch to a random safe stream in next HALF-OPEN attempt
          const safeStream = SAFE_STREAMS[Math.floor(Math.random() * SAFE_STREAMS.length)];
          set({
            circuitState: 'HALF_OPEN',
            currentStream: safeStream,
            isPlaying: true,
            recentErrors: [],
          });

          setTimeout(() => {
            const finalState = useIDKStreamStore.getState();
            if (finalState.circuitState === 'HALF_OPEN') {
              console.log('[IDKstream] Circuit Breaker: Flawless recovery completed. Resetting to CLOSED state.');
              set({ circuitState: 'CLOSED', recentErrors: [] });
            }
          }, 10000);
        }
      }, 3000);
    } else {
      set({ recentErrors: pruned });
      if (get().isSurfing) {
        playNextRandomStream();
      }
    }
  },

  clearErrors: () =>
    set({ recentErrors: [] }),

  setValidatedQueue: (queue: IPTVChannel[]) =>
    set({ validatedQueue: queue, queueSize: queue.length }),

  popFromQueue: () => {
    const { validatedQueue } = get();
    if (validatedQueue.length === 0) return null;
    const [next, ...rest] = validatedQueue;
    set({ validatedQueue: rest, queueSize: rest.length });
    return next;
  },

  pushToQueue: (stream: IPTVChannel) => {
    const { validatedQueue } = get();
    const updated = [...validatedQueue, stream];
    set({ validatedQueue: updated, queueSize: updated.length });
  },

  playNextRandomStream: () => {
    const { popFromQueue, channels, sharedPlaylist } = get();
    let nextStream = popFromQueue();
    if (!nextStream) {
      const pool = sharedPlaylist ? sharedPlaylist.streams : channels;
      if (pool.length > 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        nextStream = pool[randomIndex];
      }
    }
    set({ currentStream: nextStream, isPlaying: nextStream !== null, isSurfing: true });
  },

  // ── Auth Actions ────────────────────────────────────

  setUser: (user: UserProfile | null) =>
    set({ user }),

  loginWithGoogle: async () => {
    try {
      await signInWithGoogle();
      // The page will redirect to Google OAuth; state is restored on return
    } catch (err) {
      console.error('[IDKstream] Google sign-in failed:', err);
    }
  },

  logout: async () => {
    await authSignOut();
    set({ user: null, bookmarks: [], playlists: [] });
  },

  // ── Bookmark Actions ────────────────────────────────

  setBookmarks: (bookmarks: IPTVChannel[]) =>
    set({ bookmarks }),

  syncBookmarks: async () => {
    const bookmarks = await fetchBookmarks();
    set({ bookmarks });
  },

  toggleBookmark: async (stream: IPTVChannel) => {
    const { user, bookmarks } = get();
    if (!user) return; // Must be authenticated

    const isBookmarked = bookmarks.some((b) => b.id === stream.id);

    if (isBookmarked) {
      // Optimistic removal
      set({ bookmarks: bookmarks.filter((b) => b.id !== stream.id) });
      const success = await removeBookmark(stream.id);
      if (!success) {
        // Rollback on failure
        set({ bookmarks });
      }
    } else {
      // Optimistic addition
      set({ bookmarks: [...bookmarks, stream] });
      const success = await addBookmark(stream);
      if (!success) {
        // Rollback on failure
        set({ bookmarks });
      }
    }
  },

  // ── Playlist Actions ────────────────────────────────

  setPlaylists: (playlists: Playlist[]) =>
    set({ playlists }),

  syncPlaylists: async () => {
    const playlists = await fetchUserPlaylists();
    set({ playlists });
  },

  createPlaylist: async (title: string, streams: IPTVChannel[]) => {
    const playlist = await createPlaylistAPI(title, streams);
    if (playlist) {
      const { playlists } = get();
      set({ playlists: [playlist, ...playlists] });
    }
    return playlist;
  },

  deletePlaylist: async (id: string) => {
    const { playlists } = get();
    // Optimistic removal
    set({ playlists: playlists.filter((p) => p.id !== id) });
    const success = await deletePlaylistAPI(id);
    if (!success) {
      // Rollback
      set({ playlists });
    }
  },

  sharePlaylist: async (id: string) => {
    const code = await generateShareCode(id);
    if (code) {
      // Update the playlist in state with the new share code
      const { playlists } = get();
      set({
        playlists: playlists.map((p) =>
          p.id === id ? { ...p, share_code: code, is_public: true } : p
        ),
      });
    }
    return code;
  },

  setSharedPlaylist: (playlist: Playlist | null) => {
    set({
      sharedPlaylist: playlist,
      validatedQueue: [],
      queueSize: 0,
      isSurfing: false,
    });

    if (playlist && playlist.streams.length > 0) {
      // Start with the first stream of the playlist
      set({ currentStream: playlist.streams[0], isPlaying: true });
    }
  },
}));
