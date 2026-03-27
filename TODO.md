# TODO

## Phase 1: Infrastructure & Core [COMPLETED]
- [x] Install Vite, Rolldown/esbuild.
- [x] Configure `publint` and `jsr.json`.
- [x] Implement `SnapMessage` binary parsing (38-byte header).
- [x] Create `SnapStream` client for WebSocket binary data.
- [x] Implement precise server-time synced playback scheduling.
- [x] Refactor application to follow MVC architectural pattern.

## Models (Core Logic & Protocol)
- [ ] Expand `SnapMessage` test suite (coverage for all 5 message types and serialization). [priority:medium]
- [ ] Add `TimeProvider` unit tests for server-local time sync and drift management. [priority:high]
- [ ] Create `SnapClient` mock tests for WebSocket lifecycle and event multiplexing. [priority:medium]
- [ ] Add FLAC decoding support for high-fidelity lossless streams. [priority:high]
- [ ] Implement Opus decoder for low-latency, bandwidth-efficient streaming. [priority:high]
- [ ] Add Vorbis codec support for legacy Snapcast configurations. [priority:low]
- [ ] Implement `Client` JSON-RPC commands: `SetVolume`, `SetLatency`, `SetName`, `DeleteClient`. [priority:medium]
- [ ] Implement `Group` JSON-RPC commands: `SetMute`, `SetStream`, `SetClients`, `SetName`. [priority:low]
- [ ] Implement `Stream` JSON-RPC commands: `Control`, `SetProperty`, `AddStream`, `RemoveStream`. [priority:medium]

## Views (UI & Rendering)
- [ ] Implement `visualizer.loadExtraImages` to support custom textures in presets. [priority:medium]
- [ ] Componentize rich metadata display (track title, artist, album art) using `Stream.OnProperties`. [priority:medium]
- [ ] Build interactive playback UI (play, pause, next, previous) connected to `Stream.Control`. [priority:medium]
- [ ] Improve Status indicators with CSS animations and transitions. [priority:low]

## Controller (Flow & Integration)
- [ ] Handle real-time Notifications from Control WebSocket (`Client.OnVolumeChanged`, `Stream.OnUpdate`). [priority:high]
- [ ] Sync visualizer render loop with `playbackStatus` (auto-pause on `stopped`). [priority:low]
- [ ] Tie Snapcast Control API together with browser **Media Session API** (metadata/headset controls). [priority:high]
- [ ] Persist application settings (Server URL, last Stream, AA toggle, scale) in `localStorage`. [priority:low]
- [ ] Add e2e validation for audio/visualizer sync precision across network latencies. [priority:low]
- [x] Automate `snapserver` lifecycle for development and integration testing (launch server with `snaptest.conf`). [priority:medium]
