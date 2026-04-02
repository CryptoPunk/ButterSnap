# Notes

## Technology Stack
- **Runtime/Packaging**: Bun
- **Bundler**: Vite (Rolldown/esbuild)
- **Registry**: JSR
- **Validation**: publint
- **Language**: TypeScript

## Architectural Choices
- Using Bun's built-in tools for package management and script running.
- Configuring Vite for modern distribution, ensuring compatibility with JSR/publint.
- Refactored application to follow MVC architectural pattern.

## Integration Plan: Snapcast + Butterchurn
- **Snapcast Client**:
  - WebSocket connection to Snapserver.
  - Binary Protocol: 38-byte header (16-bit type, 16-bit ID, time indices, 32-bit payload size).
  - PCM Chunks (Type 4): Raw audio payload.
  - Resampling sync: Client-side clock tracking and buffer management. Precise server-time synced playback scheduling implemented.
- **Audio Processing**:
  - Multi-codec support (FLAC, Opus, Vorbis) using WASM decoders.
  - Custom `AudioStream` class based on `snapweb` logic.
  - Decode PCM and schedule playback in `AudioContext`.
  - `Butterchurn` connected to the final output node using `visualizer.connectAudio(node)`.
  - Continuous `render()` loop synced with audio playback.

## Completed Features
- **Infrastructure**: Vite, Rolldown/esbuild, publint, and JSR installed and configured. Automated `snapserver` lifecycle for dev (`serve:snap`).
- **Models**: `SnapMessage` parser with multi-codec WASM support, `SnapStream` WebSockets, `TimeProvider` for time sync, and comprehensive test suites for parsing and JSON-RPC commands.
- **Controllers**: Synced render loop with playback status, handled real-time notifications (`Client.OnVolumeChanged`, `Stream.OnUpdate`), integrated Media Session API bridges, persisted settings via `localStorage`, and added Cypress e2e suite.
- **Views**: Rich metadata component updates, interactive playback UI, Fullscreen mode, custom textures for visualizers, and polished animated glassmorphism status overlays.

## Troubleshooting
- **Port Mismatch**: Snapserver uses port `1705` for raw TCP Control but port `1780` for HTTP/WebSocket traffic. Always connect the browser/web client to **port 1780**.
- **Protocol Error**: Some Snapserver versions may reject specific subprotocol strings like `'binary'`. Standard `SnapClient` should use a default subprotocol.

## Debugging & Observability
- **JSON-RPC Logs (Client)**: Open the browser's developer console to see `SnapControl JSON-RPC` debug logs. These track every request, response, and notification between the HUD and the Snapserver.
- **JSON-RPC Logs (Plugin)**: The `snap_instrument.py` script logs its internal JSON-RPC traffic (`RX Request`, `TX Notification`, `TX Response`) to `stderr`. This can be viewed in the terminal output of `bun run dev`. 
- **Last Notification (Client)**: At any time, you can inspect `window.lastNote` in the browser console for a shortcut to the most recently received Snapcast notification payload.
- **Butterchurn ESM Interop**: In Vite, `import butterchurn from 'butterchurn'` may return a module object with a `.default` property instead of the `Butterchurn` class directly. Always check for `.default` or use a robust access pattern to avoid `createVisualizer is undefined`.

## UI Refactoring (2026-04-01)
- Removed redundant `<footer>` and `state-btn` classes from `index.html`.
- Consolidated `btn-icon` and `icon-btn` shortcuts in `uno.config.ts`.
- Refactored `style.css` to use `@apply` for shared styles (`glass-panel`, `icon-btn`), reducing manual CSS boilerplate.
- Cleaned up unused properties and commented code in `AppView.ts` (removed `chunk-count` and `latency` display references which were missing from HTML).
- Changed remote web fonts references to `@fontsource/outfit` for local file loading to improve offline capabilities and reduce external requests.

## Build & Configuration (2026-04-02)
- Added `target: 'esnext'` to `vite.config.ts` to support top-level await in library distribution, solving esbuild errors during `bun run build`.
