/**
 * IDKstream — Loading Screen
 *
 * Full-viewport loading state displayed during initial data hydration.
 * Features a CRT-styled animation with scanning effect.
 */

export function LoadingScreen() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, 
              color-mix(in srgb, var(--color-signal-cyan) 6%, transparent) 0%, 
              transparent 60%),
            radial-gradient(ellipse at 80% 80%, 
              color-mix(in srgb, var(--color-signal-magenta) 4%, transparent) 0%, 
              transparent 50%)
          `,
        }}
      />

      {/* Scanline sweep */}
      <div
        className="animate-scanline pointer-events-none absolute left-0 right-0 h-[2px] opacity-30"
        style={{
          background: `linear-gradient(90deg, transparent, var(--color-signal-cyan), transparent)`,
        }}
      />

      {/* Logo & Text */}
      <div className="animate-fade-in-up relative z-10 flex flex-col items-center gap-6">
        {/* Signal icon */}
        <div className="animate-pulse-glow flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-signal-cyan)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10" />
            <path d="M5 12a7 7 0 0 1 7-7 7 7 0 0 1 7 7" />
            <path d="M8 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4" />
            <circle cx="12" cy="12" r="1" fill="var(--color-signal-cyan)" />
          </svg>
        </div>

        {/* Brand name */}
        <h1
          className="animate-flicker text-4xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="text-text-primary">IDK</span>
          <span className="text-signal-cyan">stream</span>
        </h1>

        {/* Tagline */}
        <p
          className="text-base tracking-widest text-signal-amber font-mono font-bold uppercase amber-glow"
        >
          Tuning into the unknown
        </p>
      </div>

      {/* Loading indicator */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="loader-ring" />
        <p
          className="text-sm tracking-wider text-text-primary font-mono"
        >
          Loading global channel database...
        </p>
      </div>

      {/* Bottom decorative bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
        background: `linear-gradient(90deg, transparent, var(--color-signal-cyan), transparent)`,
        opacity: 0.3,
      }} />
    </div>
  );
}
