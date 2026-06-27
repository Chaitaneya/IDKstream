/**
 * IDKstream — Playlist Service
 *
 * CRUD operations for shareable playlists stored in Supabase Postgres.
 * Playlists can be made public via a unique share code.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { nanoid } from 'nanoid';
import type { IPTVChannel, Playlist } from '../types';

/**
 * Fetches all playlists for the current authenticated user.
 */
export async function fetchUserPlaylists(): Promise<Playlist[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[IDKstream] Playlists: fetch failed:', error.message);
    return [];
  }

  return (data || []).map(mapRowToPlaylist);
}

/**
 * Creates a new playlist with the given title and streams.
 */
export async function createPlaylist(
  title: string,
  streams: IPTVChannel[]
): Promise<Playlist | null> {
  if (!isSupabaseConfigured()) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: session.user.id,
      title,
      streams,
      is_public: false,
      share_code: null,
    })
    .select()
    .single();

  if (error) {
    console.error('[IDKstream] Playlists: create failed:', error.message);
    return null;
  }

  return mapRowToPlaylist(data);
}

/**
 * Deletes a playlist by ID.
 */
export async function deletePlaylist(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[IDKstream] Playlists: delete failed:', error.message);
    return false;
  }

  return true;
}


/**
 * Adds a stream to an existing playlist.
 */
export async function addStreamToPlaylist(
  playlistId: string,
  stream: IPTVChannel
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  // Fetch current playlist
  const { data, error: fetchErr } = await supabase
    .from('playlists')
    .select('streams')
    .eq('id', playlistId)
    .single();

  if (fetchErr || !data) return false;

  const currentStreams: IPTVChannel[] = typeof data.streams === 'string'
    ? JSON.parse(data.streams)
    : data.streams;

  // Check for duplicates
  if (currentStreams.some((s) => s.id === stream.id)) return true;

  const updatedStreams = [...currentStreams, stream];

  const { error } = await supabase
    .from('playlists')
    .update({
      streams: updatedStreams,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playlistId);

  if (error) {
    console.error('[IDKstream] Playlists: add stream failed:', error.message);
    return false;
  }

  return true;
}

// ── Helpers ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToPlaylist(row: any): Playlist {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    share_code: row.share_code,
    is_public: row.is_public,
    streams: typeof row.streams === 'string' ? JSON.parse(row.streams) : row.streams,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
