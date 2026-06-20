/**
 * IDKstream — Auth Bar & Vault Drawer (Dark Deco Theme)
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
    } catch {
      console.error('[IDKstream] Auth failed');
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
      <div className="absolute top-4 right-4 z-45 flex items-center gap-3">
        {authenticating ? (
          <div className="glass-sm px-4 py-2.5 flex items-center gap-2 text-sm text-signal-cyan font-mono animate-pulse border border-signal-cyan/20">
            <div className="w-3.5 h-3.5 border-2 border-signal-cyan border-t-transparent rounded-full animate-spin" />
            <span>CONNECTING WAVE...</span>
          </div>
        ) : !user ? (
          /* Sign In Button (Mechanical Brass) */
          <button
            onClick={handleSignIn}
            className="cursor-pointer px-4 py-2.5 bg-[#1a120c] border border-brass-dark hover:border-brass rounded font-mono text-sm font-bold text-signal-amber hover:text-brass-light hover:scale-[1.02] active:translate-y-0.5 transition-all flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_3px_6px_rgba(0,0,0,0.6)]"
            style={{ textShadow: '0 0 2px rgba(255, 157, 0, 0.6)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="var(--color-brass-light)"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--color-brass)"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--color-brass-dark)"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--color-brass-light)"/>
            </svg>
            <span>SIGN IN WITH GOOGLE</span>
          </button>
        ) : (
          /* Logged In Controls */
          <div className="flex items-center gap-3">
            {/* Bookmark Folder Switch */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="cursor-pointer p-2.5 bg-[#1a120c] border border-brass-dark hover:border-brass rounded text-signal-amber hover:text-brass-light hover:scale-[1.02] active:translate-y-0.5 transition-all relative flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_2px_4px_rgba(0,0,0,0.6)]"
              title="Open DVR Vault"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              {(bookmarks.length + playlists.length) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 rounded-full bg-signal-amber text-[10px] font-black font-mono text-black flex items-center justify-center shadow-md animate-pulse">
                  {bookmarks.length + playlists.length}
                </span>
              )}
            </button>

            {/* Profile Avatar Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="cursor-pointer flex items-center rounded-full border border-brass-dark bg-[#1a120c] hover:border-brass hover:scale-[1.02] active:translate-y-0.5 transition-all p-0.5 shadow-md"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-[#1a120c] border border-brass shadow-2xl p-4 z-50 flex flex-col gap-2 rounded-lg font-mono">
                  <div className="flex flex-col gap-1 pb-1">
                    <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Signed In As</p>
                    <p className="text-sm font-bold text-signal-amber truncate select-none leading-none">{user.name}</p>
                    <p className="text-[10px] text-text-secondary truncate select-none leading-none mt-1">{user.email}</p>
                  </div>
                  <hr className="border-brass-tarnished/40 my-1" />
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="cursor-pointer text-left px-3 py-2 text-xs font-bold rounded text-signal-red bg-[#0d0705] border border-signal-red/20 hover:border-signal-red hover:bg-signal-red/10 transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
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
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-85 bg-[#1a120c] border-l-4 border-brass-dark z-50 shadow-2xl flex flex-col transition-transform duration-300 transform font-mono ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-brass-tarnished/60 bg-[#130b07] flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-signal-amber uppercase tracking-wider flex items-center gap-1.5 amber-glow">
              <span>📼</span> VAULT // DVR
            </h2>
            {user && (
              <span className="text-[10px] text-text-secondary mt-1 truncate max-w-[220px]">
                USER: {user.email}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="cursor-pointer text-brass hover:text-brass-light transition-all text-xl font-bold font-mono"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-brass-tarnished/40 bg-[#0f0906]">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer transition-all ${
              activeTab === 'bookmarks'
                ? 'text-signal-amber border-b-2 border-signal-amber bg-[#1a120c]/40 font-black'
                : 'text-brass-dark hover:text-brass'
            }`}
          >
            ★ Bookmarks ({bookmarks.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer transition-all ${
              activeTab === 'playlists'
                ? 'text-signal-amber border-b-2 border-signal-amber bg-[#1a120c]/40 font-black'
                : 'text-brass-dark hover:text-brass'
            }`}
          >
            📋 Playlists ({playlists.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-[#150e0a]">
          {activeTab === 'bookmarks' ? (
            /* ── Bookmarks Tab ─────────────────────────── */
            bookmarks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-16 gap-3 select-none">
                <span className="text-4xl">📻</span>
                <p className="text-sm uppercase tracking-widest font-bold">No Saved Signals</p>
                <p className="text-xs text-text-secondary mt-1">
                  save a wave using the Star button on the control console while surfing.
                </p>
              </div>
            ) : (
              bookmarks.map((stream) => (
                <div
                  key={stream.id}
                  className="group relative bg-[#0f0a05] border border-brass-tarnished/30 hover:border-brass p-4 rounded-md transition-all flex items-center justify-between gap-4 overflow-hidden cursor-pointer shadow-sm"
                  onClick={() => handleSelectBookmark(stream)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brass/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="flex-1 min-w-0 flex flex-col z-10 pointer-events-none">
                    <span className="text-sm font-bold text-text-primary group-hover:text-signal-amber transition-colors truncate uppercase leading-tight">
                      {stream.name}
                    </span>
                    <span className="text-[10px] text-text-secondary uppercase mt-1.5 leading-none tracking-wide">
                      LOC: {stream.country || 'GLOB'} // GENRE: {stream.categories?.[0] || 'GEN'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 z-10">
                    <span className="text-text-muted group-hover:text-signal-amber transition-colors text-xs pointer-events-none pr-1">
                      ▶
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(stream);
                      }}
                      className="cursor-pointer p-1.5 text-text-muted hover:text-signal-red hover:bg-[#0d0705] rounded border border-transparent hover:border-signal-red/20 transition-all"
                      title="Delete Bookmark"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
              {!showNewPlaylist ? (
                <button
                  onClick={() => setShowNewPlaylist(true)}
                  className="cursor-pointer py-3 px-4 bg-[#1a120c] border border-brass-dark hover:border-brass text-xs font-bold text-signal-amber hover:text-brass-light transition-all rounded flex items-center justify-center gap-2 uppercase tracking-wider shadow-sm active:translate-y-0.5"
                >
                  ＋ Create Playlist
                </button>
              ) : (
                <div className="bg-[#0f0a05] border border-brass p-4 rounded-md flex flex-col gap-3 shadow-inner">
                  <input
                    type="text"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    placeholder="Enter playlist title..."
                    autoFocus
                    className="w-full bg-[#150e0a] border border-brass-tarnished/60 rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brass transition-colors font-mono"
                  />
                  <p className="text-[10px] text-text-secondary leading-normal">
                    Note: This playlist will import your current saved bookmarks ({bookmarks.length}).
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistTitle.trim()}
                      className="cursor-pointer flex-1 py-2 text-xs font-bold uppercase bg-brass/25 border border-brass text-brass hover:bg-brass/35 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed active:translate-y-0.5"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setShowNewPlaylist(false); setNewPlaylistTitle(''); }}
                      className="cursor-pointer flex-1 py-2 text-xs font-bold uppercase text-text-muted hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {playlists.length === 0 && !showNewPlaylist ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-16 gap-3 select-none">
                  <span className="text-4xl">📼</span>
                  <p className="text-sm uppercase tracking-widest font-bold">No Playlists Yet</p>
                  <p className="text-xs text-text-secondary mt-1">
                    create a play loop sequence using bookmarks.
                  </p>
                </div>
              ) : (
                playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group bg-[#0f0a05] border border-brass-tarnished/30 hover:border-brass p-4 rounded-md flex flex-col gap-2.5 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-text-primary uppercase truncate block leading-tight">
                          {playlist.title}
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          STREAMS: {playlist.streams.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleShare(playlist.id)}
                          className="cursor-pointer p-1.5 text-text-muted hover:text-signal-amber transition-colors relative"
                          title={playlist.share_code ? 'Copy share link' : 'Generate share link'}
                        >
                          {copiedShareCode === playlist.id ? (
                            <span className="text-signal-green text-[9px] font-bold">✓ COPIED</span>
                          ) : (
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => deletePlaylist(playlist.id)}
                          className="cursor-pointer p-1.5 text-text-muted hover:text-signal-red transition-colors"
                          title="Delete Playlist"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Stream preview list */}
                    {playlist.streams.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1 border-t border-brass-tarnished/10 pt-2.5">
                        {playlist.streams.slice(0, 3).map((stream) => (
                          <button
                            key={stream.id}
                            onClick={() => {
                              setCurrentStream(stream);
                              setIsDrawerOpen(false);
                            }}
                            className="cursor-pointer text-left text-[11px] text-text-secondary hover:text-signal-amber transition-colors truncate flex items-center gap-1.5 py-0.5"
                          >
                            <span className="text-[9px] text-brass-dark">▶</span>
                            {stream.name}
                          </button>
                        ))}
                        {playlist.streams.length > 3 && (
                          <span className="text-[10px] text-text-muted pl-3.5">
                            +{playlist.streams.length - 3} MORE STREAMS
                          </span>
                        )}
                      </div>
                    )}

                    {playlist.share_code && (
                      <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-brass-tarnished/10">
                        <span className="text-[9px] text-signal-green">●</span>
                        <span className="text-[9px] text-text-muted truncate uppercase tracking-wider">
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
        <div className="p-5 border-t border-brass-tarnished/60 bg-[#130b07]">
          <button
            onClick={() => {
              logout();
              setIsDrawerOpen(false);
            }}
            className="w-full cursor-pointer py-2.5 bg-[#0d0705] border border-signal-red/30 hover:border-signal-red text-signal-red hover:bg-signal-red/10 text-xs font-bold text-center transition-all uppercase rounded active:translate-y-0.5"
          >
            🚪 Sign Out // Disconnect
          </button>
        </div>
      </div>
    </>
  );
}
