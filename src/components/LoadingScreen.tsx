/**
 * IDKstream — Loading Screen
 *
 * Full-viewport loading state displayed during initial data hydration.
 * Features a CRT-styled animation with scanning effect.
 */

export function LoadingScreen() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden">
      {/* Background - Pure black for CRT terminal aesthetic */}
      <div className="pointer-events-none absolute inset-0 bg-[#010603]" />

      {/* Scanline sweep */}
      <div
        className="animate-scanline pointer-events-none absolute left-0 right-0 h-[2px] opacity-20"
        style={{
          background: `linear-gradient(90deg, transparent, #5bf870, transparent)`,
        }}
      />

      {/* Decorative CRT scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-0 opacity-50" />

      {/* Content */}
      <div className="animate-fade-in-up relative z-10 flex flex-col items-center gap-6" style={{ fontFamily: "'VT323', monospace" }}>
        {/* Globe TV Logo */}
        <div className="flex h-32 w-32 items-center justify-center animate-pulse">
          <img 
            src="/tv-globe-logo-cropped.jpg" 
            alt="IDKstream TV Logo" 
            className="w-full h-full object-contain"
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(91,248,112,0.4)) saturate(0) sepia(1) hue-rotate(70deg) contrast(1.5)',
              mixBlendMode: 'screen' 
            }}
          />
        </div>

        {/* Brand name */}
        <h1 className="animate-flicker text-5xl font-bold tracking-widest text-[#5bf870] crt-text-glow uppercase">
          IDKSTREAM
        </h1>

        {/* Tagline */}
        <p className="text-xl tracking-widest text-[#5bf870]/80 uppercase">
          Tuning into the unknown...
        </p>
      </div>

      {/* Loading indicator */}
      <div className="relative z-10 flex flex-col items-center gap-4 mt-8" style={{ fontFamily: "'VT323', monospace" }}>
        <div className="w-8 h-8 border-2 border-[#5bf870]/20 border-t-[#5bf870] rounded-full animate-spin shadow-[0_0_10px_rgba(91,248,112,0.5)]" />
        <p className="text-sm tracking-widest text-[#5bf870]/60 uppercase animate-pulse">
          INITIALIZING GLOBAL DATABASE
        </p>
      </div>

      {/* Bottom decorative bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
        background: `linear-gradient(90deg, transparent, #5bf870, transparent)`,
        opacity: 0.3,
      }} />
    </div>
  );
}
