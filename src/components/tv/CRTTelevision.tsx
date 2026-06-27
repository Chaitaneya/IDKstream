/**
 * CRTTelevision — The Main TV Frame Component
 *
 * Renders the photorealistic TV using trythis.png as the frame,
 * with the video player inside the screen cutout, CRT effects,
 * boot sequence, and interactive controls (volume dial, power button,
 * channel surf button).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useIDKStreamStore } from '../../store/useIDKStreamStore';
import { HlsPlayer } from '../HlsPlayer';
import { BootSequence } from './BootSequence';
import { VolumeDial } from './VolumeDial';
import { PowerButton } from './PowerButton';

type TVState = 'off' | 'booting' | 'on' | 'shutting-down';

export function CRTTelevision() {
  const [tvState, setTvState] = useState<TVState>('off');
  const [isTuning, setIsTuning] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

  // Zustand state
  const currentStream = useIDKStreamStore((s) => s.currentStream);
  const playNextRandomStream = useIDKStreamStore((s) => s.playNextRandomStream);
  const channels = useIDKStreamStore((s) => s.channels);
  const isDataLoaded = useIDKStreamStore((s) => s.isDataLoaded);
  const circuitState = useIDKStreamStore((s) => s.circuitState);
  const volume = useIDKStreamStore((s) => s.volume);
  const setVolume = useIDKStreamStore((s) => s.setVolume);
  const isMuted = useIDKStreamStore((s) => s.isMuted);
  const setIsMuted = useIDKStreamStore((s) => s.setIsMuted);

  const isChannelDisabled =
    !isDataLoaded ||
    channels.length === 0 ||
    circuitState === 'OPEN' ||
    circuitState === 'HALF_OPEN';

  // ── Power Toggle ──────────────────────────────────────
  const handlePowerToggle = useCallback(() => {
    if (tvState === 'off') {
      setTvState('booting');
    } else if (tvState === 'on') {
      setTvState('shutting-down');
      setTimeout(() => {
        setTvState('off');
      }, 500);
    }
    // Ignore during booting/shutting-down transitions
  }, [tvState]);

  // ── Boot Complete ─────────────────────────────────────
  const handleBootComplete = useCallback(() => {
    setTvState('on');
    // Auto-tune first channel
    if (!currentStream) {
      playNextRandomStream();
    }
  }, [currentStream, playNextRandomStream]);

  // ── Channel Surf (Clunk) ──────────────────────────────
  const handleChannelClunk = useCallback(() => {
    if (isChannelDisabled || tvState !== 'on') return;

    setIsTuning(true);
    playNextRandomStream();

    // Clunk sound
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
          10,
          context.currentTime + 0.15
        );
        gain.gain.setValueAtTime(0.3, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.15);
      }
    } catch {
      // Browser restriction
    }

    setTimeout(() => setIsTuning(false), 450);
  }, [isChannelDisabled, tvState, playNextRandomStream]);

  // ── Volume Controls ───────────────────────────────────
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    },
    [setVolume, isMuted, setIsMuted]
  );

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted, setIsMuted]);

  // ── Fullscreen (double-click screen) ──────────────────
  const handleScreenDoubleClick = useCallback(() => {
    const container = screenRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error('[IDKstream] Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && tvState === 'on') {
        e.preventDefault();
        handleChannelClunk();
      } else if (e.key === 'm' && tvState === 'on') {
        handleMuteToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tvState, handleChannelClunk, handleMuteToggle]);

  // ── Determine screen state CSS class ──────────────────
  const screenStateClass =
    tvState === 'off'
      ? 'crt-screen-off'
      : tvState === 'booting'
        ? 'crt-booting'
        : tvState === 'shutting-down'
          ? 'crt-shutting-down'
          : '';

  return (
    <div className="crt-tv-container">
      {/* The TV frame image */}
      <img
        src="/tv-frame.png"
        alt="CRT Television"
        className="crt-tv-frame"
        draggable={false}
      />

      {/* ── The Screen Cutout Area ──────────────────────── */}
      {/* 
        Proportions carefully measured from trythis.png:
        - Screen starts at ~6% from left, ~7% from top
        - Screen width is ~69% of TV width
        - Screen height is ~82% of TV height
        - Generous inner padding so content doesn't touch edges
      */}
      <div
        ref={screenRef}
        className={`crt-screen-area ${screenStateClass}`}
        style={{
          left: '5.5%',
          top: '7.5%',
          width: '69%',
          height: '82%',
          borderRadius: '12px / 14px',
        }}
        onDoubleClick={handleScreenDoubleClick}
      >
        {/* Screen Content */}
        <div className="crt-screen-content">
          {tvState === 'off' && (
            /* Black screen when off */
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#050505',
              }}
            />
          )}

          {tvState === 'booting' && (
            <BootSequence onComplete={handleBootComplete} />
          )}

          {tvState === 'on' && (
            <>
              {circuitState === 'OPEN' ? (
                /* Circuit breaker tripped */
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#030305',
                  }}
                >
                  <p className="crt-text-glow" style={{ fontSize: 'clamp(16px, 2vw, 24px)', letterSpacing: '0.4em' }}>
                    Tuning...
                  </p>
                  <p style={{ fontSize: '10px', color: '#9e9b8f', letterSpacing: '0.15em', fontFamily: "'VT323', monospace", textTransform: 'uppercase' }}>
                    Circuit Breaker Tripped
                  </p>
                </div>
              ) : currentStream ? (
                <HlsPlayer key={currentStream.id} stream={currentStream} />
              ) : (
                /* No signal */
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#030305',
                  }}
                >
                  <p className="crt-text-glow" style={{ fontSize: 'clamp(14px, 1.5vw, 18px)', letterSpacing: '0.3em' }}>
                    No signal
                  </p>
                </div>
              )}

              {/* Circuit breaker status */}
              {circuitState !== 'CLOSED' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 35,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'VT323', monospace",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      display: 'inline-block',
                      background:
                        circuitState === 'OPEN' ? '#ff3355' : '#ff9d00',
                      boxShadow:
                        circuitState === 'OPEN'
                          ? '0 0 6px #ff3355'
                          : '0 0 6px #ff9d00',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  <span style={{ color: '#9e9b8f', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {circuitState === 'OPEN'
                      ? 'BREAKER TRIPPED'
                      : 'RECOVERING'}
                  </span>
                </div>
              )}
            </>
          )}

          {tvState === 'shutting-down' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#fff',
              }}
            />
          )}
        </div>

        {/* CRT Effect Overlays (visible when TV is on or booting) */}
        {tvState !== 'off' && (
          <>
            {/* Static noise */}
            <div
              className="crt-static-overlay"
              style={{
                opacity:
                  isTuning || circuitState === 'OPEN'
                    ? 0.85
                    : tvState === 'booting'
                      ? 0.15
                      : currentStream
                        ? 0.03
                        : 0.2,
                transition: 'opacity 0.3s',
              }}
            />

            {/* Moving scanline sweep */}
            <div className="crt-scanline-sweep" />
          </>
        )}
      </div>

      {/* ── Controls Panel (positioned over the TV frame's right panel) ── */}

      {/* Volume Dial — positioned over the large UHF knob */}
      <VolumeDial
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        size={56}
      />
      {/* Position the dial via parent style override */}
      <style>{`
        .crt-tv-container .volume-dial {
          top: 11.5%;
          right: 7%;
          width: 11% !important;
          height: 15% !important;
          padding-bottom: 9%;
          aspect-ratio: 1;
        }
        .crt-tv-container .volume-dial .volume-dial-knob {
          position: absolute;
          inset: 0;
        }
        .crt-tv-container .physical-surf-btn {
          position: absolute;
          top: 30%;
          right: 10%;
          width: 5.5% !important;
          height: 0 !important;
          padding-bottom: 5.5%;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 50%;
          transition: transform 0.1s, box-shadow 0.1s;
          touch-action: manipulation;
        }
        .crt-tv-container .physical-surf-btn:active {
          transform: scale(0.92) translateY(2px);
        }
        .crt-tv-container .physical-surf-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          filter: grayscale(1);
        }
        .crt-tv-container .physical-surf-btn .surf-btn-inner {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #d4d0c8 0%, #babdb6 30%, #888a85 60%, #555753 100%);
          border: 1px solid #2e3436;
          box-shadow: 
            0 2px 5px rgba(0, 0, 0, 0.6), 
            inset 0 2px 3px rgba(255, 255, 255, 0.3), 
            inset 0 -2px 4px rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .crt-tv-container .physical-surf-btn:active .surf-btn-inner {
          box-shadow: 
            0 1px 2px rgba(0, 0, 0, 0.5), 
            inset 0 2px 4px rgba(0, 0, 0, 0.4);
        }
        .crt-tv-container .physical-surf-btn .surf-btn-icon {
          width: 0;
          height: 0;
          border-top: 0.8vw solid transparent;
          border-bottom: 0.8vw solid transparent;
          border-left: 1.2vw solid #2e3436;
          margin-left: 0.3vw;
          opacity: 0.8;
          filter: drop-shadow(0 1px 0 rgba(255,255,255,0.4));
        }
        .crt-tv-container .power-button {
          top: 40%;
          right: 10.1%;
          width: 4.8% !important;
          height: 4.8% !important;
          padding-bottom: 4%;
        }
        .crt-tv-container .power-button .power-button-inner {
          position: absolute;
          inset: 0;
        }
      `}</style>

      {/* Surf Button — positioned between volume and power */}
      <button
        className="physical-surf-btn"
        disabled={isChannelDisabled || tvState !== 'on'}
        onClick={handleChannelClunk}
        title="Surf Channel"
      >
        <div className="surf-btn-inner">
          <div className="surf-btn-icon" />
        </div>
      </button>

      {/* Power Button — positioned over the smaller button */}
      <PowerButton isOn={tvState === 'on' || tvState === 'booting'} onToggle={handlePowerToggle} />

      {/* Brand label below the TV */}

    </div>
  );
}
