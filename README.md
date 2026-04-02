# ButterSnap

**Primary Contact:** Max Vohra <max-oss@seattlenetworks.com>

ButterSnap is a modern, high-performance web client for [Snapcast](https://github.com/badaix/snapcast). It delivers a premium audio experience by combining bit-perfect synchronization with breathtaking real-time visualizations using [Butterchurn](https://github.com/jberg/butterchurn).

## Features

- **Sync Perfect**: Precise server-time synced playback scheduling for frame-accurate multi-room audio.
- **Visualizer**: Integrated Butterchurn (Milkdrop) visualizer with custom textures and high-refresh-rate sync.
- **Multi-Codec**: High-performance WASM decoders for FLAC, Opus, and Vorbis streams.
- **Premium UI**: Modern glassmorphism design built with Svelte 5 and UnoCSS.
- **System Integration**: Native Media Session API support for system-wide playback control.
- **Developer First**: Built-in automated `snapserver` lifecycle for local testing and debugging.

## Getting Started

### Installation

```bash
bun install
```

### Development

The easiest way to develop is using the **Stack** command, which launches both the web UI and a local mock `snapserver` concurrently:

```bash
# Start Vite + Local Snapserver
bun run dev:stack
```

Alternatively, you can run them separately:

```bash
# Start Vite UI only
bun run dev

# Start local Snapserver only
bun run serve:snap
```

> [!NOTE]
> The UI (Vite) runs on port **5173** by default.
> The local Snapserver's JSON-RPC/WebSocket interface is available on port **1780**.

### Build & Validate

```bash
# Build for production and run package validation
bun run build
```

### Testing

```bash
# Run unit and integration tests
bun test
```

## Architecture

ButterSnap follows a strict **MVC (Model-View-Controller)** pattern:

- **Model**: `SnapMessage` (protocol parsing), `SnapClient` (WebSockets/Binary), and `TimeProvider` (Clock Sync).
- **Controller**: `AppController` orchestrates event flows, state management, and media session bridges.
- **View**: `App.svelte` and `AppView.ts` handle the UI lifecycle and Butterchurn rendering loop.

## Structure

A comprehensive index of the project's structure can be found in [FILES.md](./FILES.md).

- `src/`: Core TypeScript application logic.
- `test/`: Mock server environments, plugins, and test assets.
- `public/`: Static assets including visualizer textures and album art.
- `dist/`: Generated production bundles and type definitions.

---

## Audio Attribution
`song.mp3` CC-BY-SA from ccmixter.org: https://ccmixter.org/files/cdk/70638