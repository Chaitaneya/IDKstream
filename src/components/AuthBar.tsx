/**
 * IDKstream — Auth Bar & Vault Drawer (Phosphor Terminal Theme)
 *
 * Replaces the old Dark Deco theme with a retro CRT terminal aesthetic,
 * matching the main TV frame UI. Pure blacks, dark greens, and glowing
 * phosphor text.
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

  // Local UI States
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [activeTab, setActiveTab] = useState<VaultTab>('bookmarks');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

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

  return (
    <>
      {/* ── Top-Right Auth Panel ───────────────────────── */}
      <div className="absolute top-6 right-6 z-45 flex items-center gap-4" style={{ fontFamily: "'VT323', monospace" }}>
        {authenticating ? (
          <div className="px-4 py-2 flex items-center gap-2 text-sm crt-text-glow border border-[#5bf870]/30 bg-black/60 backdrop-blur-sm">
            <span className="animate-pulse">CONNECTING...</span>
            <span className="w-2 h-4 bg-[#5bf870] animate-[boot-cursor-blink_1s_step-end_infinite]" />
          </div>
        ) : !user ? (
          /* Sign In Button (Terminal Style) */
          <button
            onClick={handleSignIn}
            className="cursor-pointer px-4 py-2 border border-[#5bf870]/40 bg-[#021008]/80 hover:bg-[#5bf870]/10 text-[#5bf870] text-sm uppercase tracking-widest transition-colors backdrop-blur-sm flex items-center gap-2 crt-text-glow group"
          >
            <span className="opacity-50 group-hover:opacity-100 transition-opacity">{'>'}</span>
            SIGN IN WITH GOOGLE
          </button>
        ) : (
          /* Logged In Controls */
          <div className="flex items-center gap-3">
            {/* Bookmark Folder Switch (Terminal Style) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="cursor-pointer px-4 py-2 border border-[#5bf870]/40 bg-[#021008]/80 hover:bg-[#5bf870]/10 text-[#5bf870] text-sm uppercase tracking-widest transition-colors backdrop-blur-sm flex items-center gap-2 crt-text-glow group"
              title="Open DVR Vault"
            >
              <span className="opacity-50 group-hover:opacity-100 transition-opacity">{'['}</span>
              VAULT
              <span className="opacity-50 group-hover:opacity-100 transition-opacity">{']'}</span>
              
              {(bookmarks.length + playlists.length) > 0 && (
                <span className="ml-2 text-xs bg-[#5bf870] text-black px-1.5 py-0.5 rounded-sm font-bold animate-pulse">
                  {bookmarks.length + playlists.length}
                </span>
              )}
            </button>

            {/* Profile Avatar Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="cursor-pointer flex items-center border border-[#5bf870]/40 bg-[#021008]/80 hover:border-[#5bf870] transition-colors p-1 backdrop-blur-sm"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 pointer-events-none grayscale sepia opacity-80"
                  style={{ filter: 'sepia(1) hue-rotate(80deg) saturate(3)' }}
                  referrerPolicy="no-referrer"
                />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-3 w-56 bg-black border border-[#5bf870]/50 shadow-[0_0_15px_rgba(91,248,112,0.15)] p-4 z-50 flex flex-col gap-2 font-mono">
                  <div className="flex flex-col gap-1 pb-2">
                    <p className="text-[10px] text-[#5bf870]/60 uppercase tracking-widest">USER_SESSION_ACTIVE</p>
                    <p className="text-base text-[#5bf870] truncate select-none leading-none crt-text-glow">{user.name}</p>
                    <p className="text-xs text-[#5bf870]/70 truncate select-none mt-1">{user.email}</p>
                  </div>
                  <div className="h-px bg-[#5bf870]/20 my-1 w-full" />
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="cursor-pointer text-left px-3 py-2 text-sm uppercase tracking-widest text-[#ff3333] bg-black border border-[#ff3333]/30 hover:bg-[#ff3333]/10 hover:border-[#ff3333] transition-colors flex items-center gap-2 mt-1"
                  >
                    <span className="opacity-70">x</span> TERMINATE SESSION
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-96 bg-[#020804] border-l border-[#5bf870]/40 z-50 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] flex flex-col transition-transform duration-300 transform font-mono ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ fontFamily: "'VT323', monospace" }}
      >
        {/* Decorative CRT scanlines over the drawer */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10" />

        {/* Drawer Header */}
        <div className="p-6 border-b border-[#5bf870]/30 bg-black flex items-center justify-between relative z-20">
          <div className="flex flex-col">
            <h2 className="text-xl text-[#5bf870] uppercase tracking-widest flex items-center gap-2 crt-text-glow">
              <span className="animate-pulse">_</span> VAULT.SYS
            </h2>
            {user && (
              <span className="text-[12px] text-[#5bf870]/60 mt-1 truncate max-w-[220px]">
                USR_ID: {user.email}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="cursor-pointer text-[#5bf870]/60 hover:text-[#5bf870] hover:bg-[#5bf870]/10 px-2 py-1 border border-transparent hover:border-[#5bf870]/40 transition-all text-sm font-bold uppercase tracking-widest"
          >
            [ESC]
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#5bf870]/30 bg-[#010a05] relative z-20">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 text-sm uppercase tracking-widest cursor-pointer transition-colors border-r border-[#5bf870]/20 ${
              activeTab === 'bookmarks'
                ? 'text-[#5bf870] bg-[#5bf870]/10 font-bold crt-text-glow shadow-[inset_0_-2px_0_#5bf870]'
                : 'text-[#5bf870]/50 hover:text-[#5bf870]/80 hover:bg-[#5bf870]/5'
            }`}
          >
            BOOKMARKS [{bookmarks.length}]
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex-1 py-3 text-sm uppercase tracking-widest cursor-pointer transition-colors ${
              activeTab === 'playlists'
                ? 'text-[#5bf870] bg-[#5bf870]/10 font-bold crt-text-glow shadow-[inset_0_-2px_0_#5bf870]'
                : 'text-[#5bf870]/50 hover:text-[#5bf870]/80 hover:bg-[#5bf870]/5'
            }`}
          >
            PLAYLISTS [{playlists.length}]
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[#010804] relative z-20">
          {activeTab === 'bookmarks' ? (
            /* ── Bookmarks Tab ─────────────────────────── */
            bookmarks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-3 select-none">
                <span className="text-[#5bf870]/30 text-4xl mb-2">{'< NULL >'}</span>
                <p className="text-sm uppercase tracking-widest text-[#5bf870]/50">NO SIGNALS SAVED</p>
              </div>
            ) : (
              bookmarks.map((stream) => (
                <div
                  key={stream.id}
                  className="group relative bg-black border border-[#5bf870]/20 hover:border-[#5bf870]/80 hover:bg-[#5bf870]/5 p-4 transition-all flex items-center justify-between gap-4 cursor-pointer"
                  onClick={() => handleSelectBookmark(stream)}
                >
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-base text-[#5bf870]/90 group-hover:text-[#5bf870] transition-colors truncate uppercase leading-tight group-hover:crt-text-glow">
                      {stream.name}
                    </span>
                    <span className="text-[11px] text-[#5bf870]/50 uppercase mt-1 tracking-widest">
                      LOC:{stream.country || 'GLOB'} | GENRE:{stream.categories?.[0] || 'GEN'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#5bf870]/30 group-hover:text-[#5bf870]/80 transition-colors text-xs pointer-events-none">
                      [PLAY]
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(stream);
                      }}
                      className="cursor-pointer px-2 py-1 text-[#5bf870]/40 hover:text-[#ff3333] border border-transparent hover:border-[#ff3333]/40 hover:bg-[#ff3333]/10 transition-all text-xs uppercase"
                      title="Delete Bookmark"
                    >
                      DEL
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
                  className="cursor-pointer py-3 px-4 bg-black border border-[#5bf870]/40 hover:bg-[#5bf870]/10 text-sm text-[#5bf870] transition-all flex items-center justify-center gap-2 uppercase tracking-widest crt-text-glow"
                >
                  + INIT_NEW_SEQUENCE
                </button>
              ) : (
                <div className="bg-black border border-[#5bf870]/60 p-4 flex flex-col gap-3 shadow-[0_0_10px_rgba(91,248,112,0.1)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#5bf870] animate-pulse">{'>'}</span>
                    <input
                      type="text"
                      value={newPlaylistTitle}
                      onChange={(e) => setNewPlaylistTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                      placeholder="SEQ_NAME"
                      autoFocus
                      className="w-full bg-transparent border-none text-base text-[#5bf870] placeholder:text-[#5bf870]/30 outline-none font-mono uppercase"
                    />
                  </div>
                  <div className="h-px bg-[#5bf870]/20 w-full" />
                  <p className="text-[11px] text-[#5bf870]/50 tracking-widest">
                    IMPORTING {bookmarks.length} BOOKMARKS...
                  </p>
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistTitle.trim()}
                      className="cursor-pointer flex-1 py-2 text-xs uppercase bg-[#5bf870]/20 border border-[#5bf870] text-[#5bf870] hover:bg-[#5bf870]/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed tracking-widest"
                    >
                      EXECUTE
                    </button>
                    <button
                      onClick={() => { setShowNewPlaylist(false); setNewPlaylistTitle(''); }}
                      className="cursor-pointer px-4 py-2 text-xs uppercase text-[#5bf870]/60 border border-[#5bf870]/30 hover:bg-[#5bf870]/10 hover:text-[#5bf870] transition-colors tracking-widest"
                    >
                      ABORT
                    </button>
                  </div>
                </div>
              )}

              {playlists.length === 0 && !showNewPlaylist ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-3 select-none">
                  <span className="text-[#5bf870]/30 text-4xl mb-2">{'[ 0 ]'}</span>
                  <p className="text-sm uppercase tracking-widest text-[#5bf870]/50">NO SEQUENCES FOUND</p>
                </div>
              ) : (
                playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group bg-black border border-[#5bf870]/20 hover:border-[#5bf870]/60 p-4 flex flex-col gap-3 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-[#5bf870]/20 pb-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-base text-[#5bf870] uppercase truncate block leading-tight font-bold">
                          {playlist.title}
                        </span>
                        <span className="text-[11px] text-[#5bf870]/50 tracking-widest">
                          ITEMS: {playlist.streams.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">

                        <button
                          onClick={() => deletePlaylist(playlist.id)}
                          className="cursor-pointer px-2 py-1 text-[#ff3333]/60 border border-[#ff3333]/30 hover:text-[#ff3333] hover:border-[#ff3333]/60 hover:bg-[#ff3333]/10 transition-colors text-xs uppercase tracking-widest"
                          title="Delete Playlist"
                        >
                          DEL
                        </button>
                      </div>
                    </div>

                    {/* Stream preview list */}
                    {playlist.streams.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {playlist.streams.slice(0, 3).map((stream) => (
                          <button
                            key={stream.id}
                            onClick={() => {
                              setCurrentStream(stream);
                              setIsDrawerOpen(false);
                            }}
                            className="cursor-pointer text-left text-[12px] text-[#5bf870]/60 hover:text-[#5bf870] hover:bg-[#5bf870]/10 transition-colors truncate flex items-center gap-2 py-1 px-1"
                          >
                            <span className="text-[10px] text-[#5bf870]/40">{'>'}</span>
                            {stream.name}
                          </button>
                        ))}
                        {playlist.streams.length > 3 && (
                          <span className="text-[11px] text-[#5bf870]/40 pl-4 mt-1 tracking-widest">
                            ...AND {playlist.streams.length - 3} MORE
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-[#5bf870]/30 bg-black relative z-20">
          <button
            onClick={() => {
              logout();
              setIsDrawerOpen(false);
            }}
            className="w-full cursor-pointer py-3 bg-[#0a0202] border border-[#ff3333]/40 hover:bg-[#ff3333]/10 hover:border-[#ff3333] text-[#ff3333] text-sm tracking-widest text-center transition-all uppercase flex justify-center items-center gap-2"
          >
            <span className="opacity-70">[X]</span> DISCONNECT
          </button>
        </div>
      </div>
    </>
  );
}
