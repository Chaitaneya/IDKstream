<div align="center">
  # IDKstream
  
  <img src="./public/tv-globe-logo.png" alt="IDKstream Logo" width="250" />
  
  **An anti-algorithmic, retro-futuristic live TV surfing platform and 3D geographic deduction game.**
</div>

---

## Overview

**IDKstream** was built to solve severe decision fatigue ("the Netflix Paradox"). Instead of infinite vertical scrolling and recommendation feeds, the platform delivers instant, unpredictable live video and audio from across the globe. 

Evolving into a 3D geographic deduction game, IDKstream combines a rock-solid background streaming engine with an interactive WebGL globe and bare CRT shaders. Players surf raw, uncurated global streams and guess their origin country.

## Core Features

- **The "Clunk" Engine**: A high-velocity stream manager that instantly overrides state and loads random global live feeds.
- **Intelligent Pre-Warming**: A background manager that maintains a localized memory queue of validated streams to ensure zero dead links and instant zapping.
- **Client-Side Circuit Breaker**: An automated state engine that intervenes during cascading stream failures to prevent interface flickering or memory crashes.
- **3D Geographic Game Layer**: Explore a 3D WebGL globe, guess the stream's country of origin, and earn points based on Haversine distance proximity.

## The "Server Problem" & Our Solution

When building a global streaming aggregator, one of the biggest challenges is verifying if a community stream endpoint is actually alive and playable. 

**The Problem**: Standard server-side HTTP `HEAD` or generic `GET` requests to validate streams are unreliable. We consistently hit roadblocks with **server-side spoofing** and `405 Method Not Allowed` behaviors. Furthermore, many streams have strict CORS policies that only reveal their true playability when tested within a real browser sandbox.

**The Solution**: We completely abandoned server-side validation. Instead, IDKstream utilizes a **silent, headless player engine instance** running directly in the client's browser. A stream is only flagged as "Healthy" if it successfully triggers an `Hls.Events.MANIFEST_PARSED` callback. This guarantees both browser CORS compatibility and live playlist integrity without relying on a centralized backend.

## Deep Dive & Architecture Breakdown

*I will be adding a deep-dive breakdown of the architecture and game mechanics in an upcoming X (Twitter) article.*
**[Link to the X article breakdown will go here]**

## Local Development

IDKstream is a client-first Progressive Web App (PWA) built with React, TypeScript, and Vite.

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```
