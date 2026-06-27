import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useIDKStreamStore } from '../store/useIDKStreamStore';
import type { IPTVChannel } from '../types';

interface HlsPlayerProps {
  stream: IPTVChannel;
}

export function HlsPlayer({ stream }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Zustand state and actions
  const volume = useIDKStreamStore((s) => s.volume);
  const isMuted = useIDKStreamStore((s) => s.isMuted);
  const pushError = useIDKStreamStore((s) => s.pushError);

  // Component states
  const [loading, setLoading] = useState(true);
  const [showOsd, setShowOsd] = useState(true);
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

  return (
    <div className="relative w-full h-full bg-black select-none overflow-hidden">
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className="w-full h-full object-fill"
      />

      {/* Retro On-Screen Display (OSD) Overlay — CRT Green Phosphor Style */}
      <div
        className={`absolute top-4 left-4 z-30 transition-opacity duration-700 flex flex-col gap-1 pointer-events-none select-none`}
        style={{
          fontFamily: "'VT323', monospace",
          padding: '8px 12px',
          background: 'rgba(5, 50, 30, 0.6)',
          border: '1px solid rgba(91, 248, 112, 0.15)',
          borderRadius: 6,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: showOsd ? 1 : 0,
        }}
      >
        <div className="crt-text-glow" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5bf870', display: 'inline-block', boxShadow: '0 0 4px #5bf870', animation: 'pulse 2s infinite' }} />
          <span>RECEIVING LIVE SIGNAL</span>
        </div>
        <div className="crt-text-glow" style={{ fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 'bold', letterSpacing: '0.05em', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stream.name}
        </div>
        <div className="crt-text-glow" style={{ fontSize: 12, letterSpacing: '0.1em', opacity: 0.8 }}>
          ORIGIN: {stream.country || 'GLOBAL'}
        </div>
        {stream.categories && stream.categories.length > 0 && (
          <div style={{ fontSize: 11, color: 'rgba(91, 248, 112, 0.6)', fontFamily: "'VT323', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            GENRE: {stream.categories.join(' / ')}
          </div>
        )}
      </div>

      {/* Loading Ring Overlay */}
      {loading && !playerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 pointer-events-none">
          <div className="loader-ring" />
        </div>
      )}

      {/* Playback Error Overlay */}
      {playerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-6 text-center animate-fade-in-up font-mono">
          <span className="text-4xl mb-2">📡</span>
          <span className="text-signal-red text-xs font-bold tracking-widest uppercase mb-1">
            Signal Interrupted
          </span>
          <span className="text-[9px] text-text-secondary max-w-xs uppercase mb-4 leading-relaxed">
            {playerError === 'Network load recovery timeout' || playerError === 'Native HLS loading failed' || playerError === 'Playback Stall'
              ? 'This station wave has high attenuation or has been blacked out (CORS/SSL)'
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
            className="cursor-pointer px-4 py-1.5 border border-brass-dark hover:border-brass text-brass rounded text-[9px] font-bold uppercase transition-all bg-black shadow-md active:translate-y-0.5"
          >
            ↻ Re-Tune Wave
          </button>
        </div>
      )}
    </div>
  );
}
