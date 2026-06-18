import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useIDKStreamStore } from '../store/useIDKStreamStore';
import type { IPTVChannel } from '../types';
import { addStreamToPlaylist } from '../services/playlistService';

interface HlsPlayerProps {
  stream: IPTVChannel;
}

export function HlsPlayer({ stream }: HlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Zustand state and actions
  const volume = useIDKStreamStore((s) => s.volume);
  const isMuted = useIDKStreamStore((s) => s.isMuted);
  const setVolume = useIDKStreamStore((s) => s.setVolume);
  const setIsMuted = useIDKStreamStore((s) => s.setIsMuted);
  const pushError = useIDKStreamStore((s) => s.pushError);
  const user = useIDKStreamStore((s) => s.user);
  const bookmarks = useIDKStreamStore((s) => s.bookmarks);
  const toggleBookmark = useIDKStreamStore((s) => s.toggleBookmark);
  const playlists = useIDKStreamStore((s) => s.playlists);
  const syncPlaylists = useIDKStreamStore((s) => s.syncPlaylists);

  const [showAuthReminder, setShowAuthReminder] = useState(false);
  const [showPlaylistsDropdown, setShowPlaylistsDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isBookmarked = bookmarks.some((b) => b.id === stream.id);

  const handleBookmarkToggle = () => {
    if (!user) {
      setShowAuthReminder(true);
      setTimeout(() => setShowAuthReminder(false), 3500);
      return;
    }
    toggleBookmark(stream);
  };

  const handleAddToPlaylistClick = () => {
    if (!user) {
      setShowAuthReminder(true);
      setTimeout(() => setShowAuthReminder(false), 3500);
      return;
    }
    setShowPlaylistsDropdown((prev) => !prev);
  };

  // Component states
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOsd, setShowOsd] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Fade out OSD after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOsd(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Sync volume and muted state to the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Track fullscreen changes (e.g. if exited via Escape key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Initialize and load Hls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setPlayerError(null);

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let isDestroyed = false;

    const handleFatalError = (message: string) => {
      if (isDestroyed) return;
      console.error(`[IDKstream] Player caught fatal: ${message}`);
      setPlayerError(message);
      pushError(Date.now());
    };

    // Stall Protection: Failover if the stream doesn't play within 3 seconds
    const stallTimer = setTimeout(() => {
      console.warn('[IDKstream] Playback stall detected: failed to play in 3s');
      handleFatalError('Playback Stall');
    }, 3000);

    const clearStallTimer = () => {
      clearTimeout(stallTimer);
    };

    video.addEventListener('playing', clearStallTimer);
    video.addEventListener('timeupdate', clearStallTimer);

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 8,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 3000,
        manifestLoadingMaxRetry: 1,
        fragLoadingTimeOut: 4000,
        fragLoadingMaxRetry: 1,
      });
      hlsRef.current = hls;

      hls.loadSource(stream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isDestroyed) return;
        setLoading(false);
        video.play().catch((err) => {
          console.warn('[IDKstream] Playback start error:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[IDKstream] Fatal network error, trying to recover...', data);
              hls.startLoad();
              // If it stays stuck loading for 3 more seconds, trigger failover
              setTimeout(() => {
                if (hlsRef.current === hls && loadingRef.current && !isDestroyed) {
                  handleFatalError('Network load recovery timeout');
                }
              }, 3000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[IDKstream] Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              handleFatalError(`Fatal stream playback error: ${data.details}`);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari/iOS support
      video.src = stream.url;

      const onLoadedMetadata = () => {
        if (isDestroyed) return;
        setLoading(false);
        video.play().catch((err) => {
          console.warn('[IDKstream] Playback start error:', err);
        });
      };

      const onError = () => {
        if (isDestroyed) return;
        handleFatalError('Native HLS loading failed');
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);

      return () => {
        isDestroyed = true;
        clearTimeout(stallTimer);
        video.removeEventListener('playing', clearStallTimer);
        video.removeEventListener('timeupdate', clearStallTimer);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
      };
    } else {
      handleFatalError('Browser does not support HLS playback');
    }

    return () => {
      isDestroyed = true;
      clearTimeout(stallTimer);
      video.removeEventListener('playing', clearStallTimer);
      video.removeEventListener('timeupdate', clearStallTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream.url, pushError]);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error(`[IDKstream] Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setControlsVisible(true)}
      onMouseLeave={() => setControlsVisible(false)}
      className="relative w-full h-full bg-black group select-none overflow-hidden"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className="w-full h-full object-contain"
        onClick={() => setControlsVisible((prev) => !prev)}
      />

      {/* Retro On-Screen Display (OSD) Overlay */}
      <div
        className={`absolute top-4 left-4 font-mono text-xs text-signal-green pointer-events-none select-none z-30 transition-opacity duration-500 flex flex-col gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
          showOsd ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-signal-red animate-pulse" />
          <span>LIVE</span>
        </div>
        <div className="text-text-primary text-base font-bold tracking-wide mt-1 uppercase">
          {stream.name}
        </div>
        <div>COUNTRY: {stream.country || 'GLOBAL'}</div>
        {stream.categories && stream.categories.length > 0 && (
          <div>GENRE: {stream.categories.join(' / ').toUpperCase()}</div>
        )}
        <div className="text-[10px] text-text-secondary mt-1">CORS CAPABLE // OK</div>
      </div>

      {/* Loading Ring Overlay */}
      {loading && !playerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none">
          <div className="loader-ring" />
        </div>
      )}

      {/* Playback Error Overlay */}
      {playerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-6 text-center animate-fade-in-up font-mono">
          <span className="text-4xl mb-3">📡</span>
          <span className="text-signal-red text-sm font-bold tracking-widest uppercase mb-1">
            Signal Lost
          </span>
          <span className="text-[10px] text-text-secondary max-w-xs uppercase mb-4 leading-relaxed">
            {playerError === 'Network load recovery timeout' || playerError === 'Native HLS loading failed' || playerError === 'Playback Stall'
              ? 'This stream is currently offline or blocking request origin (CORS)'
              : playerError}
          </span>
          <button
            onClick={() => {
              setPlayerError(null);
              setLoading(true);
              if (hlsRef.current) {
                hlsRef.current.loadSource(stream.url);
                hlsRef.current.startLoad();
              } else if (videoRef.current) {
                videoRef.current.src = stream.url;
                videoRef.current.load();
              }
            }}
            className="cursor-pointer px-4 py-1.5 border border-signal-cyan/40 hover:border-signal-cyan text-signal-cyan rounded text-[10px] font-bold uppercase transition-all"
          >
            ↻ Retry Connection
          </button>
        </div>
      )}

      {/* Control overlay Hud */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-40 transition-all duration-300 ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        {/* Left: Volume Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="cursor-pointer text-text-primary hover:text-signal-cyan transition-colors"
          >
            {isMuted || volume === 0 ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M3 9.75h3.182m0-3h3.636l3.502-3.502a.614.614 0 011.08.43v16.144a.614.614 0 01-1.08.43l-3.502-3.502H6.182c-.69 0-1.3-.418-1.558-1.054l-.066-.164a2.203 2.203 0 00-.776-1.014h0" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 accent-signal-cyan bg-border h-1 rounded-lg appearance-none cursor-pointer focus:outline-none"
          />
        </div>

        {/* Right: Bookmarks & Fullscreen Controls */}
        <div className="flex items-center gap-4">
          {/* Bookmark Button */}
          <div className="relative">
            <button
              onClick={handleBookmarkToggle}
              className={`cursor-pointer transition-colors ${
                isBookmarked ? 'text-signal-magenta hover:text-signal-magenta/80' : 'text-text-primary hover:text-signal-magenta'
              }`}
            >
              {isBookmarked ? (
                <svg width="20" height="20" fill="currentColor" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.172-.44.82-.44.992 0l2.094 5.342 5.753.836c.477.069.668.653.322.988l-4.162 4.053 1.0 5.729c.083.477-.421.843-.846.619l-5.143-2.707-5.143 2.707c-.425.224-.928-.142-.846-.619l1.0-5.729-4.162-4.053c-.346-.335-.155-.919.322-.988l5.753-.836 2.094-5.342z" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.172-.44.82-.44.992 0l2.094 5.342 5.753.836c.477.069.668.653.322.988l-4.162 4.053 1.0 5.729c.083.477-.421.843-.846.619l-5.143-2.707-5.143 2.707c-.425.224-.928-.142-.846-.619l1.0-5.729-4.162-4.053c-.346-.335-.155-.919.322-.988l5.753-.836 2.094-5.342z" />
                </svg>
              )}
            </button>

            {/* Auth Tooltip Reminder */}
            {showAuthReminder && (
              <div
                className="absolute bottom-8 right-0 glass-sm p-3 w-44 text-[10px] text-text-primary z-50 text-center animate-fade-in-up"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="text-signal-cyan font-bold block mb-1">SIGN IN REQUIRED</span>
                Sign in in the top-right to save streams!
              </div>
            )}
          </div>

          {/* Add to Playlist Button */}
          <div className="relative flex items-center">
            <button
              onClick={handleAddToPlaylistClick}
              className="cursor-pointer text-text-primary hover:text-signal-cyan transition-colors"
              title="Add to Playlist"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Playlists Dropdown */}
            {showPlaylistsDropdown && (
              <div className="absolute bottom-8 right-0 glass p-2.5 w-48 z-50 flex flex-col gap-1.5 shadow-2xl font-mono text-[10px]">
                <p className="px-2 py-0.5 text-text-muted uppercase border-b border-border/50 pb-1 font-bold">ADD TO PLAYLIST</p>
                {playlists.length === 0 ? (
                  <p className="px-2 py-2 text-text-muted italic text-center">No playlists created yet. Create one in the Vault drawer.</p>
                ) : (
                  <div className="flex flex-col max-h-32 overflow-y-auto gap-0.5">
                    {playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        onClick={async () => {
                          const success = await addStreamToPlaylist(playlist.id, stream);
                          if (success) {
                            await syncPlaylists();
                            setToastMessage(`Added to ${playlist.title}!`);
                            setTimeout(() => setToastMessage(null), 2500);
                          }
                          setShowPlaylistsDropdown(false);
                        }}
                        className="cursor-pointer text-left px-2 py-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-signal-cyan transition-colors truncate"
                      >
                        {playlist.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Toast */}
            {toastMessage && (
              <div className="absolute bottom-8 right-0 glass-sm p-2 w-36 text-center text-signal-green z-50 text-[10px] animate-fade-in-up font-bold">
                {toastMessage}
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="cursor-pointer text-text-primary hover:text-signal-cyan transition-colors"
          >
            {isFullscreen ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L3 3m0 0l3.75 0M3 3l0 3.75M15 9l6-6m0 0l-3.75 0M21 3v3.75M9 15l-6 6m0 0h3.75M3 21v-3.75M15 15l6 6m0 0h-3.75M21 21v-3.75" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
