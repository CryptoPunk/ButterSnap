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

## Structure
- `src/`: Source code
- `dist/`: Built artifacts and types (generated)
- `jsr.json`: JSR configuration
- `vite.config.ts`: Vite build settings
- `package.json`: Main project configuration
