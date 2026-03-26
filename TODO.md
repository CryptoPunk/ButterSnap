# TODO

- [x] Install Vite, Rolldown/esbuild (Vite 6 uses esbuild for speed). [priority:high]
- [x] Install and configure publint for package validation. [priority:medium]
- [x] Configure `jsr.json` and JSR fields in `package.json`. [priority:medium]
- [x] Setup source/distribution directory structure. [priority:medium]
- [x] Add basic Vite build config with declaration generation. [priority:medium]

## Next Steps: Snapcast + Butterchurn
- [ ] Add `butterchurn` and `butterchurn-presets` dependencies. [priority:high]
- [ ] Create a WebSocket-based Snapcast client for audio streaming. [priority:high]
- [ ] Implement audio decoding (likely PCM support first). [priority:medium]
- [ ] Setup Butterchurn visualizer with a sample preset. [priority:medium]
- [ ] Bridge Snapcast audio data to Butterchurn's `AnalyserNode`. [priority:high]
