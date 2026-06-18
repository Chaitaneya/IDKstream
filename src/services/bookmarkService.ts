/**
 * IDKstream — Bookmark Service
 *
 * CRUD operations for bookmarks stored in Supabase Postgres,
 * protected by Row Level Security (RLS).
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { IPTVChannel } from '../types';

/**
 * Fetches all bookmarks for the current authenticated user.
 */
export async function fetchBookmarks(): Promise<IPTVChannel[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[IDKstream] Bookmarks: fetch failed:', error.message);
    return [];
  }

  // Map DB rows back to IPTVChannel shape for the store
  return (data || []).map((row) => ({
    id: row.stream_id,
    name: row.stream_name,
    url: row.stream_url,
    country: row.stream_country || 'Unknown',
    language: 'Unknown',
    categories: row.stream_categories || [],
  }));
}

/**
 * Adds a stream to the current user's bookmarks.
 */
export async function addBookmark(stream: IPTVChannel): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { error } = await supabase.from('bookmarks').insert({
    user_id: session.user.id,
    stream_id: stream.id,
    stream_name: stream.name,
    stream_url: stream.url,
    stream_country: stream.country,
    stream_categories: stream.categories || [],
  });

  if (error) {
    // Duplicate bookmark — not a real error
    if (error.code === '23505') {
      console.log('[IDKstream] Bookmarks: already bookmarked');
      return true;
    }
    console.error('[IDKstream] Bookmarks: add failed:', error.message);
    return false;
  }

  return true;
}

/**
 * Removes a bookmark by stream_id for the current user.
 */
export async function removeBookmark(streamId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('stream_id', streamId);

  if (error) {
    console.error('[IDKstream] Bookmarks: delete failed:', error.message);
    return false;
  }

  return true;
}
