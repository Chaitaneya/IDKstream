/**
 * IDKstream — TypeScript Type Definitions
 *
 * Core types for the iptv-org data model, stream health telemetry,
 * and the Zustand state tree.
 */

/**
 * Role: This file acts as the "contract" for our data. 
 * It tells TypeScript exactly what a TV channel looks like, 
 * ensuring we don't accidentally try to read a property that doesn't exist 
 * (like channel.website instead of channel.url).


 */
// ============================================================
// iptv-org Raw API Types
// ============================================================

/** Raw channel object from https://iptv-org.github.io/api/channels.json */
export interface IPTVRawChannel {
  id: string;
  name: string;
  alt_names: string[];
  network: string | null;
  owners: string[];
  country: string;
  categories: string[];
  is_nsfw: boolean;
  launched: string | null;
  closed: string | null;
  replaced_by: string | null;
  website: string | null;
}

/** Raw stream object from https://iptv-org.github.io/api/streams.json */
export interface IPTVRawStream {
  channel: string;
  url: string;
  feed: string | null;
  title: string;
}

// ============================================================
// IDKstream Internal Types
// ============================================================

/** Sanitized, joined channel+stream record used throughout the app */
export interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  country: string;
  language: string;
  categories: string[];
}

/** Per-stream health telemetry stored in IndexedDB */
export interface StreamHealth {
  streamId: string;           // SHA-256 hash of the stream URL
  healthScore: number;        // 0 to 100
  lastValidatedAt: number;    // Unix timestamp (ms)
  successfulPlays: number;
  failedPlays: number;
  averageWatchTime: number;   // seconds
  corsCompatible: boolean;
  fragmentVerified: boolean;  // true if fragment-level CORS was confirmed
  lastError: string | null;   // e.g., 'networkError', 'cors', '404', 'timeout'
}

// ============================================================
// Supabase Database Types
// ============================================================

/** Bookmark row as stored in Supabase Postgres */
export interface Bookmark {
  id: string;
  user_id: string;
  stream_id: string;
  stream_name: string;
  stream_url: string;
  stream_country: string | null;
  stream_categories: string[];
  created_at: string;
}

/** Playlist row as stored in Supabase Postgres */
export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  share_code: string | null;
  is_public: boolean;
  streams: IPTVChannel[];
  created_at: string;
  updated_at: string;
}

/** User profile shape (from Supabase auth) */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

/** Circuit breaker states */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Zustand store state shape */
export interface IDKStreamState {
  // Data layer
  channels: IPTVChannel[];
  isDataLoaded: boolean;
  isDataLoading: boolean;
  dataError: string | null;

  // Playback
  currentStream: IPTVChannel | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isSurfing: boolean;

  // Circuit Breaker
  circuitState: CircuitState;
  recentErrors: number[]; // timestamps of recent fatal errors

  // Pre-warmed queue
  validatedQueue: IPTVChannel[];
  queueSize: number;

  // Auth & Bookmarks
  user: UserProfile | null;
  bookmarks: IPTVChannel[];

  // Playlists
  playlists: Playlist[];
  sharedPlaylist: Playlist | null;

  // Actions
  setChannels: (channels: IPTVChannel[]) => void;
  setDataLoaded: (loaded: boolean) => void;
  setDataLoading: (loading: boolean) => void;
  setDataError: (error: string | null) => void;
  setCurrentStream: (stream: IPTVChannel | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  setIsSurfing: (surfing: boolean) => void;
  setCircuitState: (state: CircuitState) => void;
  pushError: (timestamp: number) => void;
  clearErrors: () => void;
  setValidatedQueue: (queue: IPTVChannel[]) => void;
  popFromQueue: () => IPTVChannel | null;
  pushToQueue: (stream: IPTVChannel) => void;
  playNextRandomStream: () => void;
  
  // Auth & Bookmark Actions
  setUser: (user: UserProfile | null) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setBookmarks: (bookmarks: IPTVChannel[]) => void;
  syncBookmarks: () => Promise<void>;
  toggleBookmark: (stream: IPTVChannel) => Promise<void>;

  // Playlist Actions
  setPlaylists: (playlists: Playlist[]) => void;
  syncPlaylists: () => Promise<void>;
  createPlaylist: (title: string, streams: IPTVChannel[]) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  sharePlaylist: (id: string) => Promise<string | null>;
  setSharedPlaylist: (playlist: Playlist | null) => void;
}
