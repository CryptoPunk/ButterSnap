# TODO

- [x] Install Vite, Rolldown/esbuild (Vite 6 uses esbuild for speed). [priority:high]
- [x] Install and configure publint for package validation. [priority:medium]
- [x] Configure `jsr.json` and JSR fields in `package.json`. [priority:medium]
- [x] Setup source/distribution directory structure. [priority:medium]
- [x] Add basic Vite build config with declaration generation. [priority:medium]

## Next Steps: Snapcast + Butterchurn
- [x] Add `butterchurn` and `butterchurn-presets` dependencies. [priority:high]
- [x] Implement `SnapMessage` header parsing (38 bytes). [priority:high]
- [x] Create `SnapStream` client for WebSocket binary data. [priority:high]
- [x] Setup `AudioContext` and connect it to Butterchurn. [priority:medium]
- [x] Implement PCM chunk decoding and playback sync. [priority:medium]
- [x] Build basic UI with a canvas and stream selector. [priority:medium]
- [x] Verify WebSocket port is 1780 (NOT 1705). [priority:high]
- [x] Add anti-aliasing (AA) toggle to visualizer. [priority:medium]
- [x] Fix `baseUrl` deprecation in `tsconfig.json` (TS 7.0 compatibility). [priority:low]
