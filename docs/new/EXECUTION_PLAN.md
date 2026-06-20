# PRD 2.0 Execution Plan: IDKstream — The 3D Geographic Stream Game

## Overview

Transform the existing IDKstream live-video engine into an interactive geographic deduction game. The current streaming architecture (fetching, caching, circuit breaker, pre-warming, auth, bookmarks, playlists) remains **untouched**. This plan focuses entirely on the **new presentation and game layer** built on top of the existing hooks/callbacks.

---

## User Review Required

> **IMPORTANT — Visual Design Decisions Needed** (from PRD 2.0's own final question):
> 1. What color should the **country hover highlight** be on the globe? (e.g., cyan glow `#00f0ff`, gold/brass `#c5a059`, magenta `#ff00aa`)
> 2. What color should the **trajectory line** (guess → actual) be during the reveal? (e.g., signal-amber `#ff9d00`, red `#ff3355`, cyan `#00f0ff`)

> **WARNING — Breaking Layout Change**: The current UI is a centered Art Deco TV cabinet with a side control panel. PRD 2.0 replaces this with a **full-viewport space scene** with a floating CRT overlay in the bottom-left. The TV cabinet, control panel knobs, speaker grille, and AuthBar positioning will all be replaced. The Vault/Bookmarks/Playlists drawer and auth flow are preserved but repositioned.

## Open Questions

> 1. **Globe Library**: Should we use **React Three Fiber (R3F)** + `@react-three/drei` (React-idiomatic, better state integration) or **raw Three.js** (lighter, fewer dependencies)? **Recommendation: R3F** since the project is already React-based.
> 2. **GeoJSON Data Source**: Should we bundle a GeoJSON file of world political borders locally (≈ 300KB simplified) or fetch it from a CDN at runtime?
> 3. **Game Mode Toggle**: Should the game mode replace the current "surf mode" entirely, or should users be able to switch between "Classic Surf" and "Geo Game" modes?
> 4. **Mobile Support**: The 3D globe with raycasting is heavily desktop-oriented. Should we build a fallback 2D map picker for mobile, or scope mobile out for now?
> 5. **Sound Effects**: Should we add sound effects for guess submission, correct/wrong answers, and trajectory animation? (The existing "clunk" audio code would be a good base.)

---

## Current Architecture Snapshot

```
App.tsx (Hydration, Auth, Routing)
├── LoadingScreen.tsx
├── MainScreen.tsx (TV Cabinet UI)
│   ├── HlsPlayer.tsx (HLS Playback)
│   └── AuthBar.tsx (Auth, Vault Drawer)
├── Services Layer
│   ├── dataService.ts (iptv-org Fetch + Cache)
│   ├── validationService.ts (Pre-warming Loop)
│   ├── telemetryService.ts (Health Scoring)
│   ├── corsBlocklist.ts (CORS Domain Blocklist)
│   ├── bookmarkService.ts (Bookmark CRUD)
│   ├── playlistService.ts (Playlist CRUD)
│   ├── authService.ts (Google OAuth)
│   └── supabaseClient.ts (Supabase Client)
└── State
    └── useIDKStreamStore.ts (Zustand — Playback, Queue, Auth, Bookmarks)
```

### Files That Will NOT Be Modified

| File | Reason |
|------|--------|
| `dataService.ts` | Stream engine — out of scope per PRD |
| `validationService.ts` | Pre-warming engine — out of scope |
| `telemetryService.ts` | Health scoring — out of scope |
| `corsBlocklist.ts` | CORS blocklist — out of scope |
| `bookmarkService.ts` | Bookmark CRUD — out of scope |
| `playlistService.ts` | Playlist CRUD — out of scope |
| `authService.ts` | Auth flow — out of scope |
| `supabaseClient.ts` | Supabase client — out of scope |
| `useIDKStreamStore.ts` | Stream state — minimal/no changes |
| `vite.config.ts` | Build config — no changes needed |

---

## Proposed Changes

---

### Phase 1: New Dependencies & Project Setup

Install the 3D rendering stack and GeoJSON utilities.

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

We'll also bundle a simplified world GeoJSON file (Natural Earth 110m countries, ~300KB) in `src/assets/geo/`.

---

### Phase 2: Game State & Types

#### [MODIFY] `src/types/index.ts`

Add new game-related types:

```typescript
/** Game round state */
export interface GameRound {
  roundNumber: number;
  targetStream: IPTVChannel;       // The stream being played (hidden country)
  targetCountryCode: string;       // ISO 3166-1 alpha-2 (hidden from DOM)
  guessedCountryCode: string | null;
  isRevealed: boolean;
  score: number;
  distanceKm: number | null;
}

/** Persistent game session (localStorage) */
export interface GameSession {
  totalScore: number;
  roundsPlayed: number;
  currentRound: number;
  highScore: number;
  rounds: GameRound[];
}

/** Country centroid data for Haversine calculations */
export interface CountryCentroid {
  code: string;     // ISO alpha-2
  name: string;
  lat: number;
  lng: number;
}
```

#### [NEW] `src/store/useGameStore.ts`

Separate Zustand store for game state. This keeps game logic completely decoupled from the existing stream engine store.

**State shape:**
- `gameActive: boolean` — Whether game mode is on
- `currentRound: GameRound | null` — Active round data
- `session: GameSession` — Cumulative session data
- `hoveredCountry: string | null` — ISO code of currently hovered country
- `selectedCountry: string | null` — ISO code of clicked/locked country
- `isRevealing: boolean` — Animation state during reveal
- `trajectoryData: { from: [lat, lng], to: [lat, lng] } | null` — For arc animation

**Actions:**
- `startGame()` — Initialize session, trigger first stream
- `selectCountry(code)` — Lock a country selection
- `submitGuess()` — Compare guess vs. actual, compute Haversine, animate trajectory
- `nextRound()` — Trigger `playNextRandomStream()` from existing store, reset round
- `endGame()` — Persist high score to localStorage
- `setHoveredCountry(code)` / `clearHover()`

**Anti-cheat:** The `targetCountryCode` is stored only in the Zustand store (JavaScript memory), never rendered to DOM attributes or data attributes. The `IPTVChannel.country` field is scrubbed from any DOM-visible elements.

---

### Phase 3: Haversine Scoring Engine

#### [NEW] `src/services/gameService.ts`

Pure utility functions (no side effects):

- **`haversineDistance(lat1, lng1, lat2, lng2): number`** — Great-circle distance in km between two coordinate pairs
- **`calculateScore(distanceKm): number`** — Proximity-based scoring:
  - 0 km (exact match): **5,000 points**
  - ≤ 500 km: 4,000–4,999 points (linear interpolation)
  - ≤ 2,000 km: 2,000–3,999 points
  - ≤ 5,000 km: 500–1,999 points
  - > 5,000 km: **0 points**
- **`getCountryCentroid(countryCode): CountryCentroid | null`** — Lookup coordinates
- **`loadSession(): GameSession`** — Read from localStorage
- **`saveSession(session): void`** — Write to localStorage

#### [NEW] `src/assets/geo/countryCentroids.ts`

Static lookup table mapping ISO 3166-1 alpha-2 codes → `{ lat, lng, name }` for all ~195 countries. Used for Haversine distance calculation and trajectory line endpoints.

#### [NEW] `src/assets/geo/countries.geojson`

Simplified Natural Earth 110m political boundaries GeoJSON (~300KB). Used for rendering borders on the 3D globe and raycasting hit detection.

---

### Phase 4: The Interactive 3D Space Globe

This is the **largest phase** — the centerpiece WebGL component.

#### [NEW] `src/components/game/SpaceScene.tsx`

The top-level React Three Fiber `<Canvas>` wrapper:
- **Camera**: Perspective camera, positioned slightly off-center right
- **Background**: Deep space void (`#030308`) with subtle particle starfield
- **Lighting**: Ambient + directional light for realistic globe illumination
- **Post-processing**: Subtle bloom for glow effects
- **Controls**: `OrbitControls` from drei — constrained to rotation only (no zoom past limits)

#### [NEW] `src/components/game/Globe.tsx`

The 3D political globe:
- **Geometry**: `SphereGeometry` with high segment count for smooth curvature
- **Texture**: Custom procedural dark political map (dark ocean, subtly lit landmasses)
- **GeoJSON Borders**: Parse `countries.geojson` → project lat/lng to 3D sphere coordinates → render as `LineSegments` on the globe surface
- **Auto-rotation**: Slow continuous rotation around Y-axis when idle
- **Hover highlight**: Raycaster from R3F's `useFrame` + `onPointerMove` to detect which country polygon the cursor is over → highlight that country's border lines with a glow material
- **Click to lock**: Click a country → persist selection, keep borders highlighted in a distinct "locked" color, enable Submit button

#### [NEW] `src/components/game/CountryMesh.tsx`

Individual country shape rendered on the globe surface:
- Receives GeoJSON polygon coordinates, projects to sphere
- Manages hover/selected visual states
- Uses `ShaderMaterial` or `MeshBasicMaterial` for the glow/highlight effect

#### [NEW] `src/components/game/Starfield.tsx`

Background particle system:
- `Points` geometry with randomized positions in a large sphere
- Subtle twinkle animation via custom shader
- Low poly count for performance (~2000 particles)

#### [NEW] `src/components/game/TrajectoryArc.tsx`

Animated 3D arc line connecting two country centroids on the globe:
- Uses `TubeGeometry` along a `QuadraticBezierCurve3` elevated above the globe surface
- Animated draw-on effect (progressive `drawRange` animation)
- Glowing emissive material
- Triggered during the "Reveal" phase of the game loop

---

### Phase 5: CRT Shader Streamer Overlay

The video player moves from the centered TV cabinet to a bottom-left floating overlay with pure CRT shader effects.

#### [NEW] `src/components/game/CRTOverlay.tsx`

Container for the floating CRT video panel:
- **Position**: Fixed, bottom-left corner, above the 3D scene (z-indexed over the Canvas)
- **Size**: ~30% viewport width, 4:3 aspect ratio
- **Content**: Wraps the existing `<HlsPlayer>` component (no HLS changes)
- **CRT Shader Effects (CSS-only, no WebGL needed for the video)**:
  - **Barrel distortion**: CSS `perspective` + slight `rotateY`/`rotateX` transforms to simulate screen curvature
  - **Scanlines**: `repeating-linear-gradient` overlay (already exists in current CSS, will be refined)
  - **Phosphor bleed/glow**: `box-shadow` with colored insets + slight CSS `filter: blur()` on a composited duplicate layer
  - **Vignette**: `radial-gradient` overlay darkening edges

> **NOTE**: The PRD explicitly says "bare CRT" — no physical TV frame, no wooden cabinet, no brass trim. This is a major departure from the current Art Deco aesthetic. The CRT effects are purely shader/CSS on the raw video element.

#### [MODIFY] `src/components/HlsPlayer.tsx`

**Minimal changes**:
- Remove the OSD overlay that currently displays `stream.country` (anti-cheat: hide origin metadata from DOM)
- The OSD can show stream name and genre but **NOT** the country code
- Keep all HLS logic, error handling, and stall protection identical

---

### Phase 6: Game UI Components (HTML/CSS Overlays)

These are 2D HTML UI elements floating above the 3D scene.

#### [NEW] `src/components/game/GameHUD.tsx`

Heads-Up Display:
- **Top-left**: Round counter (`ROUND 3 / ∞`), total score
- **Bottom-left (above CRT)**: Hovered country name label
- **Bottom-center**: "Submit Guess" button (enabled only when a country is locked)
- **Scoring reveal panel**: Animated popup showing distance, points earned, trajectory animation trigger

#### [NEW] `src/components/game/ScoreReveal.tsx`

Post-guess reveal overlay:
- Shows the guess vs. actual country
- Animated score counter (counting up effect)
- Distance in km
- "Next Round" button which triggers `playNextRandomStream()` via the game store

#### [MODIFY] `src/components/MainScreen.tsx`

**Major rewrite** — This component currently renders the entire TV cabinet layout. It will be restructured to:

1. Render `<SpaceScene>` as the full-viewport background
2. Render `<CRTOverlay>` with the `<HlsPlayer>` in the bottom-left
3. Render `<GameHUD>` overlay
4. Render `<AuthBar>` (repositioned to top-right, already absolute-positioned)
5. Keep the shared playlist banner
6. **Remove**: TV cabinet, control panel, brass knobs, speaker grille, volume dial, fullscreen lever

The existing volume/mute controls will be simplified to minimal icon buttons within the `<CRTOverlay>` or `<GameHUD>`.

---

### Phase 7: CSS & Styling Updates

#### [MODIFY] `src/index.css`

- **Keep**: All animation keyframes, glass utilities, scrollbar styles, design tokens
- **Add**: New CRT bare shader CSS classes (barrel distortion, phosphor bleed)
- **Add**: Game HUD styling (score display, submit button, reveal animations)
- **Add**: Space scene background styles
- **Modify**: `body` overflow stays `hidden` since the 3D scene fills the full viewport
- **Keep** (but deprecate): `.bakelite-cabinet`, `.brass-trim` classes
- **Keep**: `.art-deco-wallpaper` as a fallback/loading screen background

#### [MODIFY] `src/index.html`

- Update `<title>` to reflect the game: `IDKstream // Geographic Stream Game`
- Update `<meta description>` accordingly

---

## File Change Summary

### New Files (12)

| File | Purpose |
|------|---------|
| `src/store/useGameStore.ts` | Game state management (Zustand) |
| `src/services/gameService.ts` | Haversine, scoring, localStorage |
| `src/assets/geo/countryCentroids.ts` | Country centroid lookup table |
| `src/assets/geo/countries.geojson` | Simplified world political borders |
| `src/components/game/SpaceScene.tsx` | R3F Canvas wrapper |
| `src/components/game/Globe.tsx` | 3D political globe with borders |
| `src/components/game/CountryMesh.tsx` | Individual country shape/mesh |
| `src/components/game/Starfield.tsx` | Background particle starfield |
| `src/components/game/TrajectoryArc.tsx` | Animated guess→actual arc |
| `src/components/game/CRTOverlay.tsx` | Floating bare CRT video panel |
| `src/components/game/GameHUD.tsx` | Game heads-up display |
| `src/components/game/ScoreReveal.tsx` | Post-guess score reveal |

### Modified Files (5)

| File | Change Scope |
|------|-------------|
| `src/types/index.ts` | Add `GameRound`, `GameSession`, `CountryCentroid` types |
| `src/components/MainScreen.tsx` | Major rewrite — space scene + CRT overlay layout |
| `src/components/HlsPlayer.tsx` | Remove country from OSD (anti-cheat) |
| `src/index.css` | Add CRT shader and game HUD styles |
| `index.html` | Update title and meta description |

### Untouched Files (8+)

All service files, auth, Supabase client, existing Zustand store, Vite config, and the LoadingScreen.

---

## Implementation Order

| Step | Phase | Description | Est. Effort |
|------|-------|-------------|-------------|
| 1 | Phase 1 | Install Three.js / R3F dependencies | 5 min |
| 2 | Phase 2 | Add game types to `types/index.ts` | 15 min |
| 3 | Phase 3 | Build `gameService.ts` (Haversine, scoring, localStorage) | 30 min |
| 4 | Phase 3 | Create `countryCentroids.ts` data file | 20 min |
| 5 | Phase 2 | Build `useGameStore.ts` (game state management) | 45 min |
| 6 | Phase 4 | Bundle GeoJSON + build `Globe.tsx` with country borders | 90 min |
| 7 | Phase 4 | Build `CountryMesh.tsx` with hover/select raycasting | 60 min |
| 8 | Phase 4 | Build `Starfield.tsx` background particles | 20 min |
| 9 | Phase 4 | Build `SpaceScene.tsx` canvas wrapper | 30 min |
| 10 | Phase 4 | Build `TrajectoryArc.tsx` animated reveal line | 45 min |
| 11 | Phase 5 | Build `CRTOverlay.tsx` with bare CRT shader CSS | 40 min |
| 12 | Phase 5 | Modify `HlsPlayer.tsx` — scrub country from OSD | 10 min |
| 13 | Phase 6 | Build `GameHUD.tsx` and `ScoreReveal.tsx` | 45 min |
| 14 | Phase 6 | Rewrite `MainScreen.tsx` to compose all new components | 60 min |
| 15 | Phase 7 | Update `index.css` with new styles | 30 min |
| 16 | Phase 7 | Update `index.html` meta tags | 5 min |
| 17 | — | Integration testing & polish | 60 min |

**Total Estimated Effort: ~10 hours**

---

## Anti-Cheat Strategy (Detail)

The `IPTVChannel.country` field is the answer key. Anti-cheat measures:

1. **DOM Scrubbing**: Remove `stream.country` from ALL rendered JSX — the HLS player OSD, the control panel readout, any `data-*` attributes or `title` attributes
2. **Zustand Isolation**: The `targetCountryCode` lives only in `useGameStore` (in-memory JS state), never serialized to DOM
3. **Network Obfuscation**: The stream URL itself might hint at the country (e.g., `france24.com`). Full URL obfuscation is **out of scope** per PRD ("sit on top of existing hooks") — but we strip the URL from any DOM-visible elements
4. **Console Protection**: The game store won't log the answer to console

---

## Verification Plan

### Automated Tests

```bash
# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Build verification (production bundle)
npm run build
```

### Manual Verification Checklist

- [ ] Globe renders with visible country borders on a dark sphere
- [ ] Starfield particles visible in the background
- [ ] Hovering a country highlights its borders
- [ ] Clicking a country locks the selection (different visual state)
- [ ] Submit button is disabled until a country is selected
- [ ] Submit triggers Haversine distance calculation
- [ ] Score reveal panel shows correct distance (km) and points
- [ ] Trajectory arc animates between guessed and actual country centroids
- [ ] "Next Round" loads a new stream via the existing engine
- [ ] CRT overlay shows live video with scanlines, barrel distortion, vignette
- [ ] Country metadata is NOT visible in browser DevTools Elements panel
- [ ] localStorage persists total score and high score across page reloads
- [ ] Circuit breaker states (OPEN / HALF_OPEN / CLOSED) still function correctly
- [ ] Auth / Bookmarks / Playlists drawer still works from new layout
- [ ] Performance: 60fps on the 3D scene with HLS playback running simultaneously
- [ ] No console errors or warnings from the game layer
