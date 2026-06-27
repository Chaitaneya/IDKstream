/**
 * IDKstream — Main Application Component
 *
 * Handles initial data hydration, auth state synchronization,
 * and renders the main layout.
 */

import { useEffect } from 'react';
import { useIDKStreamStore } from './store/useIDKStreamStore';
import { loadChannels } from './services/dataService';
import { LoadingScreen } from './components/LoadingScreen';
import { MainScreen } from './components/MainScreen';
import { initTelemetry } from './services/telemetryService';
import { loadBlocklist } from './services/corsBlocklist';
import { startPreWarmingLoop, stopPreWarmingLoop } from './services/validationService';
import { onAuthStateChange, extractUserProfile, getSession } from './services/authService';

export default function App() {
  const isDataLoaded = useIDKStreamStore((s) => s.isDataLoaded);
  const isDataLoading = useIDKStreamStore((s) => s.isDataLoading);
  const dataError = useIDKStreamStore((s) => s.dataError);
  const setChannels = useIDKStreamStore((s) => s.setChannels);
  const setDataLoading = useIDKStreamStore((s) => s.setDataLoading);
  const setDataError = useIDKStreamStore((s) => s.setDataError);
  const setUser = useIDKStreamStore((s) => s.setUser);
  const syncBookmarks = useIDKStreamStore((s) => s.syncBookmarks);
  const syncPlaylists = useIDKStreamStore((s) => s.syncPlaylists);
  const setBookmarks = useIDKStreamStore((s) => s.setBookmarks);
  const setPlaylists = useIDKStreamStore((s) => s.setPlaylists);

  // ── Data hydration & pre-warming ─────────────────────
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setDataLoading(true);
      try {
        // Load CORS blocklist from IndexedDB
        await loadBlocklist();

        const channels = await loadChannels();
        if (!cancelled) {
          await initTelemetry();
          setChannels(channels);
          startPreWarmingLoop();
        }
      } catch (err) {
        console.error('[IDKstream] Data hydration failed:', err);
        if (!cancelled) {
          setDataError(
            err instanceof Error ? err.message : 'Failed to load channel data'
          );
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
      stopPreWarmingLoop();
    };
  }, [setChannels, setDataLoading, setDataError]);

  // ── Auth state listener ──────────────────────────────
  useEffect(() => {
    // Check for existing session on mount (handles OAuth redirect return)
    getSession().then((session) => {
      if (session) {
        const profile = extractUserProfile(session);
        setUser(profile);
        syncBookmarks();
        syncPlaylists();
      }
    });

    // Subscribe to auth changes (login/logout events)
    const unsubscribe = onAuthStateChange((_event, session) => {
      if (session) {
        const profile = extractUserProfile(session);
        setUser(profile);
        syncBookmarks();
        syncPlaylists();
      } else {
        setUser(null);
        setBookmarks([]);
        setPlaylists([]);
      }
    });

    return unsubscribe;
  }, [setUser, syncBookmarks, syncPlaylists, setBookmarks, setPlaylists]);



  // Error state
  if (dataError) {
    return <ErrorScreen error={dataError} onRetry={() => window.location.reload()} />;
  }

  // Loading state
  if (isDataLoading || !isDataLoaded) {
    return <LoadingScreen />;
  }

  // Main application
  return <MainScreen />;
}

// ── Error Screen ──────────────────────────────────────
function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <div className="text-6xl">📡</div>
      <h1 className="font-display text-2xl font-semibold text-signal-red">
        Signal Lost
      </h1>
      <p className="max-w-md text-center font-mono text-sm text-text-secondary">
        {error}
      </p>
      <button
        id="retry-button"
        onClick={onRetry}
        className="glass-sm cursor-pointer px-6 py-3 font-mono text-sm text-signal-cyan transition-all hover:border-signal-cyan"
      >
        ↻ Retry Connection
      </button>
    </div>
  );
}
