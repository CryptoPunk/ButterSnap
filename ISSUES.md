# ButterSync — Issues

## Open

- **`OpusMLDecoder` API mismatch**: `@wasm-audio-decoders/opus-ml` exposes `decodeFrame()`/`decodeFrames()` rather than a generic `decode()`. The decoder field is typed `any` so this does not cause a runtime error today, but should be addressed by either using the correct API or switching to a library with a `decode()` interface. Tracked as a TypeScript lint warning in `SnapClient.ts`.
