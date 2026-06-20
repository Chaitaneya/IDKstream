import { useState, useEffect, useRef } from 'react';
import { useIDKStreamStore } from '../store/useIDKStreamStore';
import { HlsPlayer } from './HlsPlayer';
import { AuthBar } from './AuthBar';
import { addStreamToPlaylist } from '../services/playlistService';

export function MainScreen() {
  const currentStream = useIDKStreamStore((s) => s.currentStream);
  const playNextRandomStream = useIDKStreamStore((s) => s.playNextRandomStream);
  const channels = useIDKStreamStore((s) => s.channels);
  const isDataLoaded = useIDKStreamStore((s) => s.isDataLoaded);
  const circuitState = useIDKStreamStore((s) => s.circuitState);
  const sharedPlaylist = useIDKStreamStore((s) => s.sharedPlaylist);
  const setSharedPlaylist = useIDKStreamStore((s) => s.setSharedPlaylist);
  
  const volume = useIDKStreamStore((s) => s.volume);
  const setVolume = useIDKStreamStore((s) => s.setVolume);
  const isMuted = useIDKStreamStore((s) => s.isMuted);
  const setIsMuted = useIDKStreamStore((s) => s.setIsMuted);

  const bookmarks = useIDKStreamStore((s) => s.bookmarks);
  const toggleBookmark = useIDKStreamStore((s) => s.toggleBookmark);
  const playlists = useIDKStreamStore((s) => s.playlists);
  const syncPlaylists = useIDKStreamStore((s) => s.syncPlaylists);
  const user = useIDKStreamStore((s) => s.user);

  // Local UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTuning, setIsTuning] = useState(false);
  const [showPlaylistsDropdown, setShowPlaylistsDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAuthReminder, setShowAuthReminder] = useState(false);

  const screenContainerRef = useRef<HTMLDivElement>(null);

  const isButtonDisabled = 
    !isDataLoaded || 
    channels.length === 0 || 
    circuitState === 'OPEN' || 
    circuitState === 'HALF_OPEN';

  const isBookmarked = currentStream 
    ? bookmarks.some((b) => b.id === currentStream.id) 
    : false;

  // Satisfying visual tuning clunk transition
  const handleChannelClunk = () => {
    if (isButtonDisabled) return;
    setIsTuning(true);
    playNextRandomStream();
    
    // Play mechanical click sound if supported
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, context.currentTime); // Low clunk sound
        osc.frequency.exponentialRampToValueAtTime(10, context.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.15);
      }
    } catch {
      // Browser autoplay restriction or not supported
    }

    setTimeout(() => {
      setIsTuning(false);
    }, 450);
  };

  const handleBookmarkClick = () => {
    if (!user) {
      setShowAuthReminder(true);
      setTimeout(() => setShowAuthReminder(false), 3500);
      return;
    }
    if (currentStream) {
      toggleBookmark(currentStream);
    }
  };

  const handlePlaylistClick = () => {
    if (!user) {
      setShowAuthReminder(true);
      setTimeout(() => setShowAuthReminder(false), 3500);
      return;
    }
    setShowPlaylistsDropdown((prev) => !prev);
  };

  // Fullscreen toggle action
  const toggleFullscreen = () => {
    const container = screenContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error('[IDKstream] Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

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

  // Volume knob drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVolume = volume;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY; // drag up to increase
      const volumeChange = deltaY / 150; // 150px drag from min to max
      const newVolume = Math.min(1, Math.max(0, startVolume + volumeChange));
      setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const startY = e.touches[0].clientY;
    const startVolume = volume;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaY = startY - moveEvent.touches[0].clientY;
      const volumeChange = deltaY / 150;
      const newVolume = Math.min(1, Math.max(0, startVolume + volumeChange));
      setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const volumeChange = -e.deltaY / 1000;
    const newVolume = Math.min(1, Math.max(0, volume + volumeChange));
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden art-deco-wallpaper p-4">
      {/* Cinematic Vignette Overlay */}
      <div className="ambient-glow" />

      {/* Auth & Bookmarks DVR bar */}
      <AuthBar />

      {/* Shared Playlist HUD Banner */}
      {sharedPlaylist && (
        <div className="absolute top-4 left-4 z-40 flex items-center gap-3">
          <div className="glass-sm px-4 py-2 flex items-center gap-3 text-xs font-mono border border-signal-magenta/40">
            <span className="text-signal-magenta animate-pulse">📼 PUBLIC PLAYLIST</span>
            <span className="text-text-secondary">|</span>
            <span className="text-text-primary font-bold uppercase truncate max-w-[200px]" title={sharedPlaylist.title}>
              {sharedPlaylist.title}
            </span>
            <span className="text-[10px] text-text-secondary">
              ({sharedPlaylist.streams.length} STREAMS)
            </span>
            <button
              onClick={() => {
                setSharedPlaylist(null);
                const url = new URL(window.location.href);
                url.searchParams.delete('playlist');
                window.history.replaceState({}, '', url.toString());
              }}
              className="cursor-pointer ml-1 px-2 py-0.5 border border-signal-red/30 hover:border-signal-red text-signal-red rounded text-[10px] font-bold transition-all uppercase"
            >
              EXIT
            </button>
          </div>
        </div>
      )}

      {/* ── 3D CSS TV Cabinet ─────────────────────────── */}
      <div className="relative z-10 w-full max-w-[1040px] mx-auto px-2">
        <div className="bakelite-cabinet w-full rounded-3xl flex flex-col md:flex-row shadow-2xl relative border-t-2 border-brass/30">
          
          {/* Subtle brass geometric Deco pin-striping line decoration */}
          <div className="absolute inset-x-0 top-1 h-[1px] bg-gradient-to-r from-transparent via-brass/40 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-1 h-[1px] bg-gradient-to-r from-transparent via-brass/40 to-transparent pointer-events-none" />

          {/* ── LEFT SECTION: The CRT Screen Area ─────────── */}
          <div className="flex-1 p-6 md:p-8 flex items-center justify-center bg-[#140e0b]/90 relative min-h-[300px] overflow-hidden md:rounded-l-3xl">
            {/* The outer wooden/bakelite screen bezel housing */}
            <div
              ref={screenContainerRef}
              className={`relative w-full aspect-[4/3] max-w-[620px] bg-black border-[14px] border-[#221611] rounded-[36px] overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,1)] transition-transform duration-300 ${
                isTuning ? 'screen-tuning-warp' : ''
              }`}
              style={{
                boxShadow: 'inset 0 0 25px rgba(0,0,0,1), 0 0 0 2px var(--color-brass-dark), 0 4px 20px rgba(0,0,0,0.6)',
              }}
            >
              {/* Screen Contents */}
              <div className="absolute inset-0 z-10 overflow-hidden bg-[#030305]">
                {circuitState === 'OPEN' ? (
                  /* Static Tuning Screen */
                  <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 z-10 animate-flicker">
                    <p className="text-xl font-bold tracking-[0.4em] text-signal-red uppercase animate-pulse">
                      Tuning...
                    </p>
                    <p className="text-[10px] tracking-wider text-text-secondary uppercase">
                      Circuit Breaker Tripped
                    </p>
                  </div>
                ) : currentStream ? (
                  <HlsPlayer key={currentStream.id} stream={currentStream} />
                ) : (
                  /* "No Signal" placeholder */
                  <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 z-10">
                    <p className="text-sm tracking-[0.3em] text-text-muted uppercase animate-flicker">
                      No signal
                    </p>
                  </div>
                )}

                {/* Static noise overlay (CRT flavor) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                    animation: 'static-noise 0.3s steps(8) infinite',
                    opacity: isTuning || circuitState === 'OPEN' ? 0.95 : currentStream ? 0.05 : 0.22,
                    zIndex: 11,
                  }}
                />

                {/* Scanlines overlay (CRT flavor) */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `repeating-linear-gradient(
                      0deg,
                      transparent 0px, transparent 2px,
                      rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px
                    )`,
                    zIndex: 12,
                  }}
                />

                {/* Animated horizontal scan line sweep */}
                <div
                  className="animate-scanline pointer-events-none absolute left-0 right-0 h-[2px] opacity-15"
                  style={{
                    background: `linear-gradient(90deg, transparent, var(--color-signal-amber), transparent)`,
                    zIndex: 13,
                  }}
                />

                {/* Screen edge vignette overlay */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.75), inset 0 0 80px rgba(0,0,0,0.5)',
                    zIndex: 15,
                  }}
                />
              </div>

              {/* Convex Glass Shield (reflection & glare) */}
              <div className="crt-glass-shield z-20" />
            </div>
          </div>

          {/* ── RIGHT SECTION: The Control Panel ───────────── */}
          <div className="w-full md:w-[320px] md:min-w-[320px] bg-[#1a120c] border-t-4 md:border-t-0 md:border-l-4 border-[#080403] p-6 md:py-7 flex flex-col justify-between gap-5 relative select-none overflow-hidden md:rounded-r-3xl">
            
            {/* Fine brass outline details */}
            <div className="absolute inset-y-0 left-0 w-[1px] bg-brass/20 hidden md:block" />

            {/* 1. Vintage OSD Digital Readout Screen */}
            <div className="bg-[#0b0704] border border-brass-tarnished p-4 rounded-lg shadow-[inset_0_0_12px_rgba(0,0,0,0.95)] flex flex-col gap-2.5 font-mono select-none">
              <div className="flex justify-between items-center text-xs text-brass-light font-black uppercase tracking-wide">
                <span>wave frequency</span>
                {currentStream && (
                  <span className="animate-pulse text-signal-amber font-mono font-bold">● sync</span>
                )}
              </div>
              <div className="amber-glow text-lg font-bold tracking-wide font-mono uppercase truncate mt-0.5">
                {currentStream ? currentStream.name : 'NO WAVE SIGNAL'}
              </div>
              <div className="flex justify-between text-xs text-text-primary font-bold">
                <span>LOC: {currentStream?.country || 'GLOB'}</span>
                <span>FREQ: {currentStream ? `${(currentStream.name.charCodeAt(0) % 200 + 400).toFixed(1)} MHz` : '--- MHz'}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-text-secondary mt-1 border-t border-brass-tarnished/30 pt-2 font-bold">
                <span>TELEMETRY //</span>
                <span className={currentStream ? "text-signal-green green-glow font-black" : "text-signal-red font-black"}>
                  {currentStream ? "CORS: OK" : "NO FEED"}
                </span>
              </div>
            </div>

            {/* 2. Interactive Volume & Projection dials */}
            <div className="grid grid-cols-2 gap-4 items-center justify-items-center">
              
              {/* Volume Rotary Dial (Brass) */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-text-secondary uppercase tracking-wide font-black">amplitude</span>
                <div
                  className="relative w-16 h-16 rounded-full cursor-ns-resize"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, var(--color-brass-light) 0%, var(--color-brass) 50%, var(--color-brass-dark) 100%)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.6)',
                    transform: `rotate(${(isMuted ? 0 : volume) * 270 - 135}deg)`,
                    transition: 'transform 0.05s ease-out'
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onWheel={handleWheel}
                >
                  {/* Indent pointer dot of the knob */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-[#23180c] rounded-full shadow-sm" />
                </div>
                <div className="text-xs text-signal-amber font-mono mt-1.5 font-black">
                  {isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}
                </div>
              </div>

              {/* Fullscreen mechanical flip lever */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] text-text-secondary uppercase tracking-wide font-black">projection</span>
                <button
                  onClick={toggleFullscreen}
                  className="relative w-10 h-16 bg-[#120c09] rounded-md border border-brass-tarnished/40 flex flex-col items-center justify-between p-1.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)] cursor-pointer"
                >
                  <div className="text-[10px] text-text-secondary font-black leading-none">FULL</div>
                  
                  {/* The metallic lever */}
                  <div
                    className={`w-6 h-8 rounded bg-gradient-to-b from-[#b89543] via-[#f3d99d] to-[#80622d] border border-[#57421c] shadow-[0_3px_5px_rgba(0,0,0,0.5)] transition-transform duration-200 transform ${
                      isFullscreen ? '-translate-y-1' : 'translate-y-1'
                    }`}
                    style={{
                      boxShadow: isFullscreen 
                        ? '0 -2px 0 rgba(255,255,255,0.2), inset 0 2px 2px rgba(255,255,255,0.4)' 
                        : '0 2px 0 rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.4)'
                    }}
                  />
                  
                  <div className="text-[10px] text-text-secondary font-black leading-none">NORM</div>
                </button>
              </div>

            </div>

            {/* 3. Small Brass Star & Playlist Buttons */}
            <div className="flex justify-center gap-4 py-1 relative">
              
              {/* Star Bookmark button */}
              <div className="flex flex-col items-center gap-1">
                <button
                  disabled={!currentStream}
                  onClick={handleBookmarkClick}
                  className={`relative w-9 h-9 rounded-full border border-[#57421c] flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{
                    background: isBookmarked 
                      ? 'radial-gradient(circle at 35% 35%, var(--color-signal-amber) 0%, var(--color-brass-dark) 100%)'
                      : 'radial-gradient(circle at 35% 35%, var(--color-brass-light) 0%, var(--color-brass) 50%, var(--color-brass-dark) 100%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
                  }}
                  title="Bookmark Stream"
                >
                  <span className="text-[15px] text-[#2c1d0c] font-black">★</span>
                </button>
                <span className="text-[11px] text-text-secondary uppercase font-black tracking-wider font-display mt-1.5">save wave</span>
              </div>

              {/* Playlist button */}
              <div className="flex flex-col items-center gap-1 relative">
                <button
                  disabled={!currentStream}
                  onClick={handlePlaylistClick}
                  className={`relative w-9 h-9 rounded-full border border-[#57421c] flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, var(--color-brass-light) 0%, var(--color-brass) 50%, var(--color-brass-dark) 100%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
                  }}
                  title="Add to Playlist"
                >
                  <span className="text-[15px] text-[#2c1d0c] font-black">＋</span>
                </button>
                <span className="text-[11px] text-text-secondary uppercase font-black tracking-wider font-display mt-1.5">add list</span>
                
                {/* Playlists Dropdown */}
                {showPlaylistsDropdown && (
                  <div className="absolute bottom-12 right-0 glass p-2.5 w-48 z-50 flex flex-col gap-1.5 shadow-2xl font-mono text-[10px]">
                    <p className="px-2 py-0.5 text-brass-light uppercase border-b border-[#57421c]/40 pb-1 font-bold">ADD TO PLAYLIST</p>
                    {playlists.length === 0 ? (
                      <p className="px-2 py-2 text-text-muted italic text-center">No playlists created yet. Create one in the Vault drawer.</p>
                    ) : (
                      <div className="flex flex-col max-h-32 overflow-y-auto gap-0.5">
                        {playlists.map((playlist) => (
                          <button
                            key={playlist.id}
                            onClick={async () => {
                              if (currentStream) {
                                const success = await addStreamToPlaylist(playlist.id, currentStream);
                                if (success) {
                                  await syncPlaylists();
                                  setToastMessage(`Added to ${playlist.title}!`);
                                  setTimeout(() => setToastMessage(null), 2500);
                                }
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
                  <div className="absolute bottom-12 right-0 glass-sm p-2 w-36 text-center text-signal-green z-50 text-[10px] animate-fade-in-up font-bold border border-signal-green/20">
                    {toastMessage}
                  </div>
                )}

                {/* Auth Reminder tooltip */}
                {showAuthReminder && (
                  <div
                    className="absolute bottom-12 right-0 glass-sm p-3 w-44 text-[10px] text-text-primary z-50 text-center animate-fade-in-up border border-signal-red/30"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span className="text-signal-red font-bold block mb-1">SIGN IN REQUIRED</span>
                    Sign in in the top-right to save waves!
                  </div>
                )}
              </div>
            </div>

            {/* 4. The Satisfying "Clunk" Channel Changer (Centerpiece Button) */}
            <div className="flex flex-col items-center gap-2 mt-1">
              <button
                id="surprise-me-button"
                disabled={isButtonDisabled}
                onClick={handleChannelClunk}
                className={`group relative w-24 h-24 rounded-full border-4 border-[#0d0705] flex items-center justify-center transition-all ${
                  isButtonDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer active:translate-y-1'
                }`}
                style={{
                  background: 'radial-gradient(circle at 35% 35%, #3c2a1c 0%, #1a110a 70%, #0d0805 100%)',
                  boxShadow: isButtonDisabled
                    ? '0 4px 0 #0d0705'
                    : '0 8px 0 #0d0705, 0 12px 16px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)',
                }}
              >
                {/* Inner metal brass knob core */}
                <div
                  className="absolute inset-2 rounded-full flex flex-col items-center justify-center p-1.5 transition-all text-center"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, var(--color-brass-light) 0%, var(--color-brass) 50%, var(--color-brass-dark) 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -2px 3px rgba(0,0,0,0.6)',
                  }}
                >
                  <span className="text-[11px] text-[#2c1d0c] font-black uppercase tracking-wider leading-none">clunk</span>
                  <span className="text-[13px] text-[#2c1d0c] font-black uppercase tracking-wider leading-none mt-0.5">surf</span>
                </div>
              </button>
              
              {/* Circuit Breaker Status Indicator bulb */}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-3 h-3 rounded-full shadow-sm transition-colors duration-300 ${
                    circuitState === 'OPEN'
                      ? 'bg-signal-red animate-pulse shadow-[0_0_6px_var(--color-signal-red)]'
                      : circuitState === 'HALF_OPEN'
                      ? 'bg-signal-amber animate-pulse shadow-[0_0_6px_var(--color-signal-amber)]'
                      : 'bg-signal-green shadow-[0_0_4px_var(--color-signal-green)]'
                  }`}
                />
                <span className="text-xs text-text-primary font-mono tracking-wider uppercase font-black text-center">
                  {circuitState === 'OPEN' ? 'BREAKER TRIPPED' : circuitState === 'HALF_OPEN' ? 'RECOVERING' : 'WAVE SYNCHRONIZED'}
                </span>
              </div>
            </div>

            {/* 5. Decorative Speaker Grille Slots */}
            <div className="w-full flex flex-col gap-1 mt-2 border-t border-brass-tarnished/10 pt-3">
              <div className="h-1.5 w-full bg-[#0e0705] rounded-full border-t border-black shadow-inner" style={{ background: 'repeating-linear-gradient(90deg, #150d0a 0px, #150d0a 6px, var(--color-brass-dark) 6px, var(--color-brass-dark) 8px)' }} />
              <div className="h-1.5 w-full bg-[#0e0705] rounded-full border-t border-black shadow-inner" style={{ background: 'repeating-linear-gradient(90deg, #150d0a 0px, #150d0a 6px, var(--color-brass-dark) 6px, var(--color-brass-dark) 8px)' }} />
              <div className="h-1.5 w-full bg-[#0e0705] rounded-full border-t border-black shadow-inner" style={{ background: 'repeating-linear-gradient(90deg, #150d0a 0px, #150d0a 6px, var(--color-brass-dark) 6px, var(--color-brass-dark) 8px)' }} />
            </div>

          </div>
        </div>

        {/* Brand footer logo detail */}
        <div className="flex items-center justify-center gap-2 mt-5 opacity-40 select-none">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-brass)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10" />
            <path d="M5 12a7 7 0 0 1 7-7 7 7 0 0 1 7 7" />
            <circle cx="12" cy="12" r="1.5" fill="var(--color-brass)" />
          </svg>
          <span className="text-xs font-bold tracking-widest text-brass font-mono">
            <span>IDK</span>
            <span className="text-brass-light ml-0.5">stream // TELE-VISION SYSTEM 04</span>
          </span>
        </div>
      </div>
    </div>
  );
}
