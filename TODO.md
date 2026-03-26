# TODO

- [x] Install Vite, Rolldown/esbuild (Vite 6 uses esbuild for speed). [priority:high]
- [x] Install and configure publint for package validation. [priority:medium]
- [x] Configure `jsr.json` and JSR fields in `package.json`. [priority:medium]
- [x] Setup source/distribution directory structure. [priority:medium]
- [x] Add basic Vite build config with declaration generation. [priority:medium]

## Next Steps: Snapcast + Butterchurn
- [ ] Add `butterchurn` and `butterchurn-presets` dependencies. [priority:high]
- [ ] Implement `SnapMessage` header parsing (38 bytes). [priority:high]
- [ ] Create `SnapStream` client for WebSocket binary data. [priority:high]
- [ ] Setup `AudioContext` and connect it to Butterchurn. [priority:medium]
- [ ] Implement PCM chunk decoding and playback sync. [priority:medium]
- [ ] Build basic UI with a canvas and stream selector. [priority:medium]
- [x] Verify WebSocket port is 1780 (NOT 1705). [priority:high]
