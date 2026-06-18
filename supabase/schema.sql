-- ============================================================
-- IDKstream — Supabase Database Schema
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Bookmarks Table ─────────────────────────────────────────
-- Stores user-bookmarked streams with Row Level Security.
-- Each user can only read/write their own bookmarks.

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stream_id TEXT NOT NULL,
  stream_name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  stream_country TEXT,
  stream_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate bookmarks per user
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_stream_unique
  ON public.bookmarks (user_id, stream_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bookmarks
CREATE POLICY "Users can read own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);


-- ── Playlists Table ─────────────────────────────────────────
-- Stores shareable playlists with an optional public share code.
-- Streams are stored as JSONB arrays of IPTVChannel objects.

CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  share_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  streams JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Users can do anything with their own playlists
CREATE POLICY "Users can CRUD own playlists"
  ON public.playlists FOR ALL
  USING (auth.uid() = user_id);

-- Anyone (even anonymous) can read public playlists via share_code
CREATE POLICY "Anyone can read public playlists"
  ON public.playlists FOR SELECT
  USING (is_public = true);
