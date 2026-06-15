# Product Requirements Document (PRD): Global Static (TV Mode)

## 1. Product Overview & Core Philosophy
**Global Static** is an anti-algorithmic, high-velocity streaming platform built to solve severe decision fatigue ("the Netflix Paradox"). Instead of infinite vertical scrolling and recommendation feeds, the platform delivers instant, unpredictable live video and audio from across the globe. It is built as a zero-friction, client-first Progressive Web App (PWA) designed to feel like browsing an old television dial or a dynamic radio tuner.

---

## 2. Target Audience
* **The "Brain-Fried" Second-Screen Watcher:** Developers, designers, and students who require interesting, unpredictable background content while focused on heavy execution tasks.
* **The Internet Explorer:** Digital surfers looking for raw, uncurated windows into local cultures (e.g., local broadcasts, traffic webcams, niche community stations) without algorithm-driven filter bubbles.

---

## 3. Core Functional Requirements

### Feature 1: The "Clunk" Engine (TV Mode: "I Don't Know What to Watch")
* **Description:** A primary, high-visibility user interaction component that instantly overrides current state and loads a random global live video feed.
* **Data Layer:** On application initialization, the system downloads a public dataset of global television networks via `iptv-org`, sanitizes it to eliminate unsafe content markers, and caches the multi-megabyte payload into local IndexedDB storage. Subsequent operations run local-first.
* **Playback Mechanics:** Media streams utilize HTTP Live Streaming (`.m3u8`). The interface limits player controls strictly to volume adjustments, audio mute states, and fullscreen presentation toggles. Traditional pause, fast-forward, or rewind timelines are explicitly omitted to preserve the live-broadcast experience.

### Feature 2: Intelligent Stream Pre-Warming Engine
* **Description:** A persistent background manager designed to isolate the user from dead community streaming endpoints.
* **Queue Strategy:** The application maintains a localized memory queue containing a minimum of **10 validated streams** up to a maximum target buffer of **20 validated streams**. 
* **Browser Validation Rules:** The engine rejects standard HTTP `HEAD` or generic `GET` validation methods due to frequent server-side spoofing and `405 Method Not Allowed` behaviors. Instead, it utilizes a silent, headless player engine instance to load potential endpoints. A stream is flagged as **Healthy** if and only if it triggers an `Hls.Events.MANIFEST_PARSED` callback, validating both browser CORS compatibility and live playlist integrity.

### Feature 3: Localized Health Scoring & Adaptive Sorting
* **Description:** The system dynamically evaluates stream durability directly inside the user's localized browser storage to refine data selection efficiency over time.
* **Telemetry Schema:** IndexedDB logs every connection attempt across key historical vectors:
  * `streamId` (Unique URL cryptographic hash)
  * `healthScore` (Moving integer scale from 0 to 100)
  * `corsCompatible` (Explicit boolean state verified by the browser sandbox)
  * `successfulPlays` / `failedPlays`
* **Selection Algorithm:** The background pre-warming engine targets endpoints using a weighted probability index. Highly reliable streams with verified CORS profiles are aggressively favored, ensuring system computational resources are not expended repeatedly testing permanently defunct links.

### Feature 4: Client-Side Circuit Breaker & Safe Mode Recovery
* **Description:** An automated state engine that intervenes during sudden cascading stream failures to prevent looping interface flickering or application DOM memory crashes.
* **State 1: CLOSED (Normal Operation):** Individual media failures immediately step to the next pre-warmed URL while reducing the target endpoint's background health parameters.
* **State 2: OPEN (Tripped):** If the playback client registers **3 critical decoding or network failures within a rolling 5-second window**, the loop instantly halts. The interface enters an explicit 3-second visual "Static Tuning Mode" block, temporarily suspending connection cycles to allow browser memory and active network requests to reset.
* **State 3: HALF-OPEN (Recovery Mode):** Following the cooling block, the engine boots into a protected safe state, exclusively playing from an explicit, hardcoded array of ultra-reliable global streams (e.g., NASA Live, Red Bull TV). The application requires **10 seconds of continuous, flawless media playback** with zero decoding exceptions before clearing historical counters, resetting the circuit state back to CLOSED, and restoring generalized random surfing.

### Feature 5: Optional Bookmark Vault (The DVR)
* **Description:** An authenticated space letting dedicated users preserve extraordinary stream discoveries.
* **Frictionless Gateway:** Authentication remains entirely **optional**. Anonymous guests can cycle, watch, and browse channels infinitely without registration prompts.
* **Authentication Provider:** Secured via serverless managed authentication using standard OAuth protocols (GitHub and Google providers).
* **Storage Rules:** Authenticated state unlocks an explicit save module on the visual dashboard overlay. Clicking the component commits the current target stream's metadata block (Name, URL string, Language metadata) directly into a persistent remote relational database protected by explicit user-isolated Row Level Security (RLS) policies.

---

## 4. Explicitly Out of Scope
* **Content Search, Sorting, or Categorization:** Providing explicit choice mechanisms fundamentally breaks the primary value proposition of anti-choice randomized curation.
* **Custom Back-End Application Layers:** The operational environment relies entirely on decentralized static CDNs, public stream APIs, and database-as-a-service platforms, eliminating long-term host execution fees.
* **Mobile App Implementations:** Development targets web application sandboxes, utilizing Progressive Web App manifests to achieve mobile responsive wrapper presentation without native app store compilation.

---

## 5. Non-Functional Performance Benchmarks
* **Time to First Stream (TTFS):** Initial media playback on clean button click must launch in under 1.5 seconds by feeding directly off the pre-warmed pipeline.
* **Error Interception Rate:** System failures must hand off control parameters to the Circuit Breaker inside 800 milliseconds of player decoding failures.
* **Target System Crash Frequency:** Application core execution loops must survive automated testing cycles containing 50 consecutive broken URLs without crashing the React DOM interface or leaking client-side memory structures.