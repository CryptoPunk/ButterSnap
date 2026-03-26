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
- **Snapcast Client**: Will utilize the Snapserver WebSocket API for JSON-RPC control and PCM audio streaming.
- **Audio Processing**: Web Audio API will be used to manage the stream, providing the necessary `AudioNode` for visualization.
- **Visualizer**: Butterchurn (WebGL implementation of Milkdrop) will consume the Snapcast audio stream using an `AnalyserNode`.
- **Latency/Sync**: Initial focus will be on low-latency audio visualization; full multi-room synchronization logic from Snapweb may be simplified if visualization is the primary goal.
