/**
 * IDKstream — Main Screen (CRT Television Layout)
 *
 * Full-viewport layout with the photorealistic CRT TV centered
 * on a pure black background with dramatic spotlight.
 * All streaming engine logic is preserved — only the presentation changed.
 */

import { useIDKStreamStore } from '../store/useIDKStreamStore';
import { CRTTelevision } from './tv/CRTTelevision';
import { AuthBar } from './AuthBar';

export function MainScreen() {
  const sharedPlaylist = useIDKStreamStore((s) => s.sharedPlaylist);
  const setSharedPlaylist = useIDKStreamStore((s) => s.setSharedPlaylist);

  return (
    <div className="tv-viewport">
      {/* Dramatic spotlight from above */}
      <div className="tv-spotlight" />

      {/* Auth & Bookmarks DVR bar */}
      <AuthBar />

      {/* Shared Playlist HUD Banner */}
      {sharedPlaylist && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div className="glass-sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontFamily: "'VT323', monospace", border: '1px solid rgba(255, 0, 170, 0.4)' }}>
            <span style={{ color: '#ff00aa', animation: 'pulse 2s infinite' }}>
              📼 PUBLIC PLAYLIST
            </span>
            <span style={{ color: '#9e9b8f' }}>|</span>
            <span
              style={{
                color: '#e6e4dc',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={sharedPlaylist.title}
            >
              {sharedPlaylist.title}
            </span>
            <span style={{ fontSize: 10, color: '#9e9b8f' }}>
              ({sharedPlaylist.streams.length} STREAMS)
            </span>
            <button
              onClick={() => {
                setSharedPlaylist(null);
                const url = new URL(window.location.href);
                url.searchParams.delete('playlist');
                window.history.replaceState({}, '', url.toString());
              }}
              style={{
                cursor: 'pointer',
                marginLeft: 4,
                padding: '2px 8px',
                border: '1px solid rgba(255, 51, 85, 0.3)',
                background: 'transparent',
                color: '#ff3355',
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontFamily: "'VT323', monospace",
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = '#ff3355';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.borderColor =
                  'rgba(255, 51, 85, 0.3)';
              }}
            >
              EXIT
            </button>
          </div>
        </div>
      )}

      {/* The CRT Television */}
      <CRTTelevision />
    </div>
  );
}
