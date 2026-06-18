/**
 * IDKstream — Auth Service
 *
 * Wraps Supabase Auth for Google OAuth sign-in/sign-out
 * and reactive auth state changes.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

/**
 * Initiates Google OAuth sign-in via Supabase redirect.
 * The page will navigate to Google's consent screen and redirect back.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn('[IDKstream] Auth: Supabase not configured, sign-in disabled');
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error('[IDKstream] Auth: Google sign-in failed:', error.message);
    throw error;
  }
}

/**
 * Signs the user out and clears the session.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[IDKstream] Auth: Sign-out failed:', error.message);
  }
}

/**
 * Gets the current auth session (null if not signed in).
 */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Extracts a UserProfile from a Supabase session.
 */
export function extractUserProfile(session: Session): UserProfile {
  const user = session.user;
  const meta = user.user_metadata;

  return {
    id: user.id,
    name: meta?.full_name || meta?.name || user.email?.split('@')[0] || 'Surfer',
    email: user.email || '',
    avatarUrl: meta?.avatar_url || meta?.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
  };
}

/**
 * Subscribes to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {}; // No-op if not configured
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
