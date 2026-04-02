# ButterSnap — Project Structure

**Primary Contact:** Max Vohra <max-oss@seattlenetworks.com>

- [.gitignore](./.gitignore) - Global exclusion file for version control.
- [FILES.md](./FILES.md) - This document, providing a comprehensive index of all tracked files.
- [ISSUES.md](./ISSUES.md) - Tracking of discovered bugs, out-of-scope tasks, and technical debt.
- [NOTES.md](./NOTES.md) - Project-wide notes, technical decisions, and troubleshooting logs.
- [README.md](./README.md) - Main project documentation, installation guides, and feature overview.
- [TODO.md](./TODO.md) - Running task list and roadmap for upcoming features.
- [bun.lock](./bun.lock) - Dependency lockfile for the Bun runtime environment.

## Documentation
- [docs/control.md](./docs/control.md) - Detailed specification for the Snapcast JSON-RPC Control API.
- [docs/stream_plugin.md](./docs/stream_plugin.md) - Reference for implementing Snapcast-compatible TCP stream plugins.

## Configuration & Build
- [index.html](./index.html) - Main HTML shell and application entry point.
- [jsr.json](./jsr.json) - Configuration for publishing the @max/buttersnap package to the JSR registry.
- [package.json](./package.json) - Project metadata, dependencies, and build script definitions.
- [tsconfig.json](./tsconfig.json) - Compiler configuration for the TypeScript environment.
- [uno.config.ts](./uno.config.ts) - Configuration for the UnoCSS utility-first styling engine.
- [vite.config.ts](./vite.config.ts) - Build and dev server configuration for the Vite bundler.

## Application Source
- [src/App.svelte](./src/App.svelte) - The main Svelte UI component for the web interface.
- [src/index.ts](./src/index.ts) - Core library entry point for integration as an NPM/JSR dependency.
- [src/main.ts](./src/main.ts) - Browser application bootstrap that initializes the MVC stack.
- [src/style.css](./src/style.css) - Global stylesheet containing premium design tokens and layout classes.
- [src/vite-env.d.ts](./src/vite-env.d.ts) - Type declarations for Vite-specific environment variables and assets.

### Client & Protocol
- [src/client/SnapClient.ts](./src/client/SnapClient.ts) - WebSocket client for receiving and decoding binary audio streams.
- [src/client/SnapControlClient.ts](./src/client/SnapControlClient.ts) - Client for managing Snapcast servers via JSON-RPC.
- [src/protocol/SnapMessage.ts](./src/protocol/SnapMessage.ts) - Binary protocol parser and message definitions for Snapcast data.
- [src/protocol/SnapProperties.ts](./src/protocol/SnapProperties.ts) - Data structures for managing stream settings and metadata.
- [src/protocol/TimeProvider.ts](./src/protocol/TimeProvider.ts) - Utility for high-precision time synchronization with the Snapserver.

### Logic & Extensions
- [src/controller/AppController.ts](./src/controller/AppController.ts) - Core application logic, event orchestration, and state management.
- [src/extensions/AppExtension.ts](./src/extensions/AppExtension.ts) - Base interface for modular application extensions.
- [src/extensions/MediaSessionExtension.ts](./src/extensions/MediaSessionExtension.ts) - Integration with the system-wide Media Session API (play/pause/metadata).
- [src/view/AppView.ts](./src/view/AppView.ts) - UI rendering logic and visualizer lifecycle management.

### Types
- [src/types/butterchurn.d.ts](./src/types/butterchurn.d.ts) - TypeScript definitions for the Butterchurn/Milkdrop visualizer.

## Assets
- [public/albums/the-bookies.jpg](./public/albums/the-bookies.jpg) - Sample album artwork for the player UI.
- [public/textures/texture1.png](./public/textures/texture1.png) - Visualizer texture asset used in rendering presets.
- [public/textures/texture2.png](./public/textures/texture2.png) - Visualizer texture asset used in rendering presets.

## Testing & Automation
- [index.test.ts](./index.test.ts) - Top-level integration and sanity tests.
- [scripts/stream_audio.py](./scripts/stream_audio.py) - Python script to simulate audio streaming for development.
- [test/snapserver/plugins/snap_instrument.py](./test/snapserver/plugins/snap_instrument.py) - Mock instrument plugin for server-side testing.
- [test/snapserver/run.sh](./test/snapserver/run.sh) - Helper script to launch a local `snapserver` environment.
- [test/snapserver/snaptest.conf](./test/snapserver/snaptest.conf) - Configuration for the test server instance.
- [test/snapserver/song.mp3](./test/snapserver/song.mp3) - Audio asset used for validation during streaming tests.

### Unit Tests
- [src/client/SnapClient.test.ts](./src/client/SnapClient.test.ts) - Tests for stream client connectivity and buffer management.
- [src/protocol/SnapMessage.test.ts](./src/protocol/SnapMessage.test.ts) - Tests for binary message parsing accuracy.
- [src/protocol/TimeProvider.test.ts](./src/protocol/TimeProvider.test.ts) - Tests for client-server clock synchronization logic.
