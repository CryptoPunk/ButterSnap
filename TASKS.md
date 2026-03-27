# Stream Plugin Implementation Tasks

## 1. Communication Infrastructure [COMPLETED]
- [x] **I/O Standard**: Establish a bidirectional, newline-delimited (NDJSON) stream using `stdin` (RX) and `stdout` (TX).
- [x] **JSON-RPC 2.0 Engine**: Implement a parser that handles `id`-based request/response cycles as well as fire-and-forget notifications.
- [x] **Startup Signal**: Immediately emit the `Plugin.Stream.Ready` notification upon process start to unlock server capabilities.

## 2. Mandatory Request Handlers (Server → Plugin)
The plugin **MUST** respond to these specific JSON-RPC methods:
- [ ] **`Plugin.Stream.Player.Control`**:
    *   Handle `play`, `pause`, `playPause`, `stop`.
    *   Handle `next`, `previous` track skipping.
    *   Handle `seek` (relative float seconds) and `setPosition` (absolute float seconds).
- [ ] **`Plugin.Stream.Player.SetProperty`**:
    *   Implement state updates for `loopStatus` (None/Track/Playlist).
    *   Implement state updates for `shuffle` (Boolean).
    *   Implement state updates for `volume` (0-100), `mute`, and playback `rate`.
- [ ] **`Plugin.Stream.Player.GetProperties`**:
    *   Return a comprehensive snapshot of the current player state, capabilities, and metadata.

## 3. State Management & Capability Flags
The plugin must maintain and report these boolean flags:
- [ ] **Control Suite**: `canControl`, `canPlay`, `canPause`, `canSeek`.
- [ ] **Navigation Suite**: `canGoNext`, `canGoPrevious`.
- [ ] **Playback Model**: 
    *   `playbackStatus`: One of `playing`, `paused`, `stopped`.
    *   `metadata`: A deep object containing fields like `title`, `artist`, `albumArtist`, `artUrl`, and `duration`.

## 4. Proactive Notifications (Plugin → Server)
- [ ] **Property Synchronization**: Emit `Plugin.Stream.Player.Properties` whenever *any* attribute (position, volume, track title) changes. 
- [ ] **Instrumentation Logs**: Implement `Plugin.Stream.Log` with compliant severity levels (`Trace` through `Fatal`).

## 5. Advanced Handling & Robustness
- [ ] **Fractional Position Tracking**: Track and report `position` as a floating-point number (seconds).
- [ ] **Embedded Art Support**: (Optional) Support `artData` as Base64 JSON.
- [ ] **Error Protocol**: Return standard JSON-RPC 2.0 error objects (e.g., `-32601`, `-32602`).
