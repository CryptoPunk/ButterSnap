# ButterSync

A modern TypeScript skeleton repository.

## Features
- **Runtime**: [Bun](https://bun.sh)
- **Bundler**: [Vite](https://vite.dev) (using esbuild for speed)
- **Validation**: [publint](https://publint.dev) for package compliance
- **Registry**: [JSR](https://jsr.io) ready
- **Language**: TypeScript (latest)

## Getting Started

### Installation
```bash
bun install
```

### Development
```bash
bun run dev
```

### Build & Validate
```bash
bun run build
```

### Testing
```bash
bun test
```

ffmpeg -i song.mp3 -f s16le -acodec pcm_s16le -ar 48000 song.pcm
snapserver -d -c ./snaptest.conf

## Structure
- `src/`: Source code
- `dist/`: Built artifacts and types (generated)
- `jsr.json`: JSR configuration
- `vite.config.ts`: Vite build settings
- `package.json`: Main project configuration
