/**
 * IDKstream — Main Screen (TV Mode)
 *
 * Approach: The TV frame image sits as the background, and the
 * screen content is positioned ON TOP of it, sized to fully cover
 * and slightly overflow the screen opening. This hides the
 * checkerboard pattern in the screen area entirely.
 *
 * The TV "body" (knobs, speaker grille, frame edges) remains
 * visible around the screen content.
 *
 * To swap TV frames:
 *   1. Replace /public/tv-frame.png
 *   2. Adjust the SCREEN constants below to match the new cutout
 */

// ── Screen cutout positions for each TV frame ──────────
// These map the % coordinates of where the screen opening
// sits within each TV frame image.
//
// To switch: change ACTIVE_TV below and the file in /public/tv-frame.png
//
const TV_CONFIGS = {
  // Silver/brown retro TV with knobs on right (3c7b835c67dbe726bab6bdb179179ef0.jpg)
  silver: {
    aspectRatio: '1.4 / 1',
    screen: { top: '7%', left: '5%', width: '66%', height: '80%', borderRadius: '16px 16px 8px 8px' },
  },
  // Red CRT with dial on right (png-clipart-s-red-and-black-crt-tv-icon.png)
  red: {
    aspectRatio: '1.35 / 1',
    screen: { top: '8%', left: '7%', width: '62%', height: '82%', borderRadius: '12px' },
  },
  // Dark RGB monitor with bottom panel (Retro-Cathode-Ray-Tube-Television-PNG-thumb.png)
  rgb: {
    aspectRatio: '1 / 1.1',
    screen: { top: '5%', left: '7%', width: '73%', height: '60%', borderRadius: '6px' },
  },
  // Wooden vintage TV with speaker grille (old-tv-television-empty-screen-1-cover.jpg)
  wooden: {
    aspectRatio: '1.05 / 1',
    screen: { top: '7%', left: '10%', width: '60%', height: '60%', borderRadius: '20px' },
  },
  // New 'trythis.png' TV frame
  trythis: {
    aspectRatio: '1.35 / 1',
    screen: { top: '9%', left: '8.5%', width: '63%', height: '74%', borderRadius: '24px 24px 16px 16px' },
  },
} as const;

import { useIDKStreamStore } from '../store/useIDKStreamStore';
import { HlsPlayer } from './HlsPlayer';
import { AuthBar } from './AuthBar';

// ▼▼▼ CHANGE THIS TO SWAP TV FRAMES ▼▼▼
const ACTIVE_TV = TV_CONFIGS.trythis;

export function MainScreen() {
  const { screen, aspectRatio } = ACTIVE_TV;

  const currentStream = useIDKStreamStore((s) => s.currentStream);
  const playNextRandomStream = useIDKStreamStore((s) => s.playNextRandomStream);
  const channels = useIDKStreamStore((s) => s.channels);
  const isDataLoaded = useIDKStreamStore((s) => s.isDataLoaded);
  const circuitState = useIDKStreamStore((s) => s.circuitState);
  const sharedPlaylist = useIDKStreamStore((s) => s.sharedPlaylist);
  const setSharedPlaylist = useIDKStreamStore((s) => s.setSharedPlaylist);

  const isButtonDisabled = !isDataLoaded || channels.length === 0 || circuitState === 'OPEN' || circuitState === 'HALF_OPEN';

  const getButtonText = () => {
    if (circuitState === 'OPEN') return '⚡ Tuning...';
    if (circuitState === 'HALF_OPEN') return '🛡️ Safe Mode';
    return '⚡ Surprise Me';
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void p-4">
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

      {/* Background ambiance */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 40%, 
              color-mix(in srgb, var(--color-signal-cyan) 3%, transparent) 0%, 
              transparent 60%)
          `,
        }}
      />

      {/* ── TV + Controls ─────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-5">

        {/* ── TV Set ───────────────────────────────────── */}
        <div
          id="tv-container"
          className="relative transition-all duration-300"
          style={{
            width: 'min(95vw, 1000px)',
            maxHeight: '82dvh',
            aspectRatio,
          }}
        >
          {/* TV Frame Image (base layer) */}
          <img
            src="/tv-frame.png"
            alt=""
            className="pointer-events-none relative block h-full w-full select-none"
            style={{ objectFit: 'contain', zIndex: 1, mixBlendMode: 'multiply' }}
            draggable={false}
          />

          {/* Screen Content — positioned over the screen opening */}
          <div
            id="tv-screen"
            className="absolute overflow-hidden"
            style={{
              top: screen.top,
              left: screen.left,
              width: screen.width,
              height: screen.height,
              borderRadius: screen.borderRadius,
              zIndex: 20,
              background: '#050508',
              boxShadow: '0 0 0 4px #050508', /* Slight bleed to cover any checkerboard edges */
            }}
          >
            {/* Media/HLS Video Player */}
            {circuitState === 'OPEN' ? (
              /* Static Tuning Screen */
              <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 z-10 animate-flicker">
                <p
                  className="text-sm font-semibold tracking-[0.4em] text-signal-red uppercase animate-pulse"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Tuning...
                </p>
                <p
                  className="text-[9px] tracking-wider text-text-secondary uppercase"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Circuit Breaker Tripped
                </p>
              </div>
            ) : currentStream ? (
              <HlsPlayer key={currentStream.id} stream={currentStream} />
            ) : (
              /* "No Signal" placeholder */
              <div className="relative flex h-full w-full flex-col items-center justify-center gap-3" style={{ zIndex: 4 }}>
                <p
                  className="text-xs tracking-[0.3em] text-text-muted uppercase animate-flicker"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
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
                opacity: circuitState === 'OPEN' ? 0.92 : currentStream ? 0.08 : 0.22,
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
                  rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px
                )`,
                zIndex: 12,
              }}
            />

            {/* Animated horizontal scan line sweep */}
            <div
              className="animate-scanline pointer-events-none absolute left-0 right-0 h-[2px] opacity-15"
              style={{
                background: `linear-gradient(90deg, transparent, var(--color-signal-cyan), transparent)`,
                zIndex: 13,
              }}
            />

            {/* Screen edge vignette overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow: 'inset 0 0 50px rgba(0,0,0,0.65), inset 0 0 100px rgba(0,0,0,0.35)',
                zIndex: 15,
              }}
            />
          </div>
        </div>

        {/* ── Controls below the TV ─────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <button
            id="surprise-me-button"
            disabled={isButtonDisabled}
            onClick={playNextRandomStream}
            className={`glass px-8 py-3 text-base font-semibold tracking-wide text-signal-cyan transition-all ${
              isButtonDisabled
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:bg-surface-hover hover:border-signal-cyan animate-pulse-glow'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {getButtonText()}
          </button>

          <div className="flex items-center gap-2 opacity-50">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-signal-cyan)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10" />
              <path d="M5 12a7 7 0 0 1 7-7 7 7 0 0 1 7 7" />
              <circle cx="12" cy="12" r="1.5" fill="var(--color-signal-cyan)" />
            </svg>
            <span
              className="text-xs font-medium tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-text-secondary">IDK</span>
              <span className="text-signal-cyan">stream</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
