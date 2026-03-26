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

## Integration Plan: Snapcast + Butterchurn
- **Snapcast Client**:
  - WebSocket connection to Snapserver.
  - Binary Protocol: 38-byte header (16-bit type, 16-bit ID, time indices, 32-bit payload size).
  - PCM Chunks (Type 4): Raw audio payload.
  - Resampling sync: Client-side clock tracking and buffer management.
- **Audio Processing**:
  - Custom `AudioStream` class based on `snapweb` logic.
  - Decode PCM and schedule playback in `AudioContext`.
  - `Butterchurn` connected to the final output node using `visualizer.connectAudio(node)`.
  - Continuous `render()` loop synced with audio playback.

## Troubleshooting
- **Port Mismatch**: Snapserver uses port `1705` for raw TCP Control but port `1780` for HTTP/WebSocket traffic. Always connect the browser/web client to **port 1780**.
- **Protocol Error**: Some Snapserver versions may reject specific subprotocol strings like `'binary'`. Standard `SnapClient` should use a default subprotocol.
