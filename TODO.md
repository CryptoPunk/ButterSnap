# TODO

## Phase 1: Infrastructure & Core [COMPLETED]
- [x] Install Vite, Rolldown/esbuild.
- [x] Configure `publint` and `jsr.json`.
- [x] Implement `SnapMessage` binary parsing (38-byte header).
- [x] Create `SnapStream` client for WebSocket binary data.
- [x] Implement precise server-time synced playback scheduling.
- [x] Refactor application to follow MVC architectural pattern.
- [x] Automate `snapserver` lifecycle for development (integrated `serve:snap`).

## Models (Core Logic & Protocol) [COMPLETED]
- [x] Expand `SnapMessage` test suite (coverage for all 5 message types and serialization).
- [x] Add `TimeProvider` unit tests for server-local time sync and drift management.
- [x] Create `SnapClient` mock tests for WebSocket lifecycle and event multiplexing.
- [x] Implement multi-codec support (FLAC, Opus, Vorbis) using WASM decoders.
- [x] Add unit tests for asynchronous decoding paths and protocol switching.
- [x] Implement full suite of JSON-RPC commands for Client, Group, and Stream management.

## Views (UI & Rendering)
- [x] Implement `visualizer.loadExtraImages` to support custom textures in presets. [priority:medium]
- [x] Componentize rich metadata display (track title, artist, album art) using `Stream.OnProperties`. [priority:medium]
- [x] Build interactive playback UI (play, pause, next, previous) connected to `Stream.Control`. [priority:medium]
- [x] Implement Fullscreen mode for the visualizer canvas (F key / UI button). [priority:medium]
- [x] Add auto-hiding overlay controls (fade out during inactivity). [priority:medium]
- [x] Improve Status indicators with CSS animations and transitions (Glassmorphism style). [priority:low]

## Controller (Flow & Integration) [COMPLETED]
- [x] Handle real-time Notifications from Control WebSocket (`Client.OnVolumeChanged`, `Stream.OnUpdate`). [priority:high]
- [x] Sync visualizer render loop with `playbackStatus` (auto-pause on `stopped`). [priority:low]
- [x] Tie Snapcast Control API together with browser **Media Session API** (metadata/headset controls). [priority:high]
- [x] Persist application settings (Server URL, last Stream, AA toggle, scale) in `localStorage`. [priority:low]
- [x] Add e2e validation for audio/visualizer sync precision across network latencies. [priority:low]
- [x] Establish Cypress E2E test suite for Media Session API bridge. [priority:high]

## Phase 3: Premium Experience
- [ ] Implement a real-time **Visual Progress Bar** in the Metadata HUD (duration/position). [priority:medium]
- [ ] Build a **Visualizer Preset Browser** with category search and favorites. [priority:medium]
- [ ] Implement **Theme customizer** (change accent colors and glow intensity). [priority:low]
- [ ] Optimize visualizer performance for high-refresh-rate displays (120Hz+ sync). [priority:medium]
- [ ] Integrate **Volume HUD** for individual client control (visual feedback on delta). [priority:low]

