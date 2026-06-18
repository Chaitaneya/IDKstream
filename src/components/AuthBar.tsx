/**
 * IDKstream — Auth Bar & Vault Drawer
 *
 * Top-right auth controls + slide-out drawer with
 * Bookmarks and Playlists tabs, including share functionality.
 */

import { useState } from 'react';
import { useIDKStreamStore } from '../store/useIDKStreamStore';
import type { IPTVChannel } from '../types';

type VaultTab = 'bookmarks' | 'playlists';

export function AuthBar() {
  const user = useIDKStreamStore((s) => s.user);
  const bookmarks = useIDKStreamStore((s) => s.bookmarks);
  const playlists = useIDKStreamStore((s) => s.playlists);
  const loginWithGoogle = useIDKStreamStore((s) => s.loginWithGoogle);
  const logout = useIDKStreamStore((s) => s.logout);
  const toggleBookmark = useIDKStreamStore((s) => s.toggleBookmark);
  const setCurrentStream = useIDKStreamStore((s) => s.setCurrentStream);
  const createPlaylist = useIDKStreamStore((s) => s.createPlaylist);
  const deletePlaylist = useIDKStreamStore((s) => s.deletePlaylist);
  const sharePlaylist = useIDKStreamStore((s) => s.sharePlaylist);

  // Local UI States
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [activeTab, setActiveTab] = useState<VaultTab>('bookmarks');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [copiedShareCode, setCopiedShareCode] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthenticating(true);
    try {
      await loginWithGoogle();
      // Page will redirect to Google OAuth — authenticating state clears on return
    } catch (err) {
      console.error('[IDKstream] Auth failed:', err);
      setAuthenticating(false);
    }
  };

  const handleSelectBookmark = (stream: IPTVChannel) => {
    setCurrentStream(stream);
    setIsDrawerOpen(false);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;
    await createPlaylist(newPlaylistTitle.trim(), [...bookmarks]);
    setNewPlaylistTitle('');
    setShowNewPlaylist(false);
  };

  const handleShare = async (playlistId: string) => {
    const code = await sharePlaylist(playlistId);
    if (code) {
      const shareUrl = `${window.location.origin}?playlist=${code}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareCode(playlistId);
      setTimeout(() => setCopiedShareCode(null), 3000);
    }
  };

  return (
    <>
      {/* ── Top-Right Auth Panel ───────────────────────── */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
        {authenticating ? (
          <div className="glass-sm px-4 py-2 flex items-center gap-2 text-xs text-signal-cyan font-mono animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-signal-cyan border-t-transparent rounded-full animate-spin" />
            <span>REDIRECTING TO GOOGLE...</span>
          </div>
        ) : !user ? (
          /* Sign In Button */
          <button
            onClick={handleSignIn}
            className="glass-sm cursor-pointer px-4 py-2 font-display text-xs font-semibold text-text-primary hover:border-signal-cyan hover:text-signal-cyan transition-all flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        ) : (
          /* Logged In State Controls */
          <div className="flex items-center gap-3">
            {/* Bookmark Folder Icon Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="glass-sm cursor-pointer p-2 text-text-primary hover:text-signal-magenta hover:border-signal-magenta transition-all relative flex items-center justify-center"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              {(bookmarks.length + playlists.length) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-signal-magenta text-[9px] font-bold font-mono text-white flex items-center justify-center animate-pulse">
                  {bookmarks.length + playlists.length}
                </span>
              )}
            </button>

            {/* Profile Avatar Button & Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="cursor-pointer flex items-center gap-2 rounded-full border border-border bg-surface hover:border-signal-cyan transition-all"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 glass p-2 z-50 flex flex-col gap-1 shadow-2xl">
                  <div className="px-2 py-1 font-mono">
                    <p className="text-[10px] text-text-muted uppercase">Signed In As</p>
                    <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
                    <p className="text-[9px] text-text-secondary truncate">{user.email}</p>
                  </div>
                  <hr className="border-border my-1" />
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="cursor-pointer text-left px-2 py-2 text-xs font-display font-medium rounded text-signal-red hover:bg-surface-hover transition-all flex items-center gap-2"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Slide-Out Vault Drawer ──────────────────────── */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-80 bg-void-light border-l border-border z-50 shadow-2xl flex flex-col transition-transform duration-300 transform font-mono ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-signal-cyan tracking-wider flex items-center gap-1.5">
              <span>📼</span> VAULT // DVR
            </h2>
            {user && (
              <span className="text-[9px] text-text-secondary mt-0.5 truncate max-w-[200px]">
                {user.email}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="cursor-pointer text-text-muted hover:text-text-primary transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-bold cursor-pointer transition-all ${
              activeTab === 'bookmarks'
                ? 'text-signal-cyan border-b-2 border-signal-cyan'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            ★ Bookmarks ({bookmarks.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-bold cursor-pointer transition-all ${
              activeTab === 'playlists'
                ? 'text-signal-magenta border-b-2 border-signal-magenta'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            📋 Playlists ({playlists.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {activeTab === 'bookmarks' ? (
            /* ── Bookmarks Tab ─────────────────────────── */
            bookmarks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12 gap-3 select-none">
                <span className="text-4xl">📻</span>
                <p className="text-xs uppercase tracking-widest">No Saved Streams</p>
                <p className="text-[10px] text-text-secondary lowercase">
                  click the star in the player HUD while surfing
                </p>
              </div>
            ) : (
              bookmarks.map((stream) => (
                <div
                  key={stream.id}
                  className="group relative glass-sm p-3 hover:border-signal-cyan transition-all flex items-center justify-between gap-3 overflow-hidden cursor-pointer"
                  onClick={() => handleSelectBookmark(stream)}
                >
                  {/* Visual scanline sweep just for hover flavor */}
                  <div className="absolute inset-0 bg-gradient-to-r from-signal-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="flex-1 min-w-0 flex flex-col z-10 pointer-events-none">
                    <span className="text-xs font-bold text-text-primary truncate uppercase group-hover:text-signal-cyan transition-colors">
                      {stream.name}
                    </span>
                    <span className="text-[9px] text-text-secondary uppercase mt-0.5">
                      {stream.country || 'GLOBAL'} // {stream.categories?.[0] || 'GENERAL'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 z-10">
                    {/* Play stream indicator */}
                    <span className="text-text-muted group-hover:text-signal-cyan transition-colors text-xs pointer-events-none pr-1">
                      ▶
                    </span>

                    {/* Remove Bookmark Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(stream);
                      }}
                      className="cursor-pointer p-1 text-text-muted hover:text-signal-red hover:bg-surface rounded transition-colors"
                      title="Delete Bookmark"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            /* ── Playlists Tab ─────────────────────────── */
            <>
              {/* Create Playlist Button */}
              {!showNewPlaylist ? (
                <button
                  onClick={() => setShowNewPlaylist(true)}
                  className="cursor-pointer glass-sm p-3 text-xs text-signal-magenta hover:border-signal-magenta transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider"
                >
                  ＋ Create Playlist
                </button>
              ) : (
                <div className="glass-sm p-3 flex flex-col gap-2">
                  <input
                    type="text"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    placeholder="Playlist name..."
                    autoFocus
                    className="w-full bg-void border border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-signal-magenta transition-colors"
                  />
                  <p className="text-[9px] text-text-secondary">
                    Your current bookmarks ({bookmarks.length}) will be added to this playlist
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistTitle.trim()}
                      className="cursor-pointer flex-1 py-1.5 text-[10px] font-bold uppercase bg-signal-magenta/20 border border-signal-magenta/40 text-signal-magenta rounded hover:bg-signal-magenta/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setShowNewPlaylist(false); setNewPlaylistTitle(''); }}
                      className="cursor-pointer flex-1 py-1.5 text-[10px] font-bold uppercase text-text-muted hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Playlists List */}
              {playlists.length === 0 && !showNewPlaylist ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12 gap-3 select-none">
                  <span className="text-4xl">🎵</span>
                  <p className="text-xs uppercase tracking-widest">No Playlists Yet</p>
                  <p className="text-[10px] text-text-secondary lowercase">
                    create a playlist from your bookmarks
                  </p>
                </div>
              ) : (
                playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group glass-sm p-3 flex flex-col gap-2 hover:border-signal-magenta transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-text-primary uppercase truncate block">
                          {playlist.title}
                        </span>
                        <span className="text-[9px] text-text-secondary">
                          {playlist.streams.length} streams
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Share Button */}
                        <button
                          onClick={() => handleShare(playlist.id)}
                          className="cursor-pointer p-1.5 text-text-muted hover:text-signal-cyan transition-colors relative"
                          title={playlist.share_code ? 'Copy share link' : 'Generate share link'}
                        >
                          {copiedShareCode === playlist.id ? (
                            <span className="text-signal-green text-[10px] font-bold">✓ Copied!</span>
                          ) : (
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                            </svg>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => deletePlaylist(playlist.id)}
                          className="cursor-pointer p-1.5 text-text-muted hover:text-signal-red transition-colors"
                          title="Delete Playlist"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Stream list preview */}
                    {playlist.streams.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {playlist.streams.slice(0, 3).map((stream) => (
                          <button
                            key={stream.id}
                            onClick={() => {
                              setCurrentStream(stream);
                              setIsDrawerOpen(false);
                            }}
                            className="cursor-pointer text-left text-[10px] text-text-secondary hover:text-signal-cyan transition-colors truncate flex items-center gap-1.5 py-0.5"
                          >
                            <span className="text-[8px] opacity-50">▶</span>
                            {stream.name}
                          </button>
                        ))}
                        {playlist.streams.length > 3 && (
                          <span className="text-[9px] text-text-muted">
                            +{playlist.streams.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Share link display */}
                    {playlist.share_code && (
                      <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-border/50">
                        <span className="text-[8px] text-signal-green">●</span>
                        <span className="text-[9px] text-text-muted truncate">
                          Public link active
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border bg-void-lighter">
          <button
            onClick={() => {
              logout();
              setIsDrawerOpen(false);
            }}
            className="w-full cursor-pointer py-2 border border-signal-red/30 text-signal-red hover:bg-signal-red/10 text-xs font-bold text-center transition-all uppercase"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
