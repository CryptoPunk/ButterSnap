import { defineConfig } from 'vite';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from 'unocss/vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    UnoCSS(),
    svelte(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'cypress/**/*']
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ButterSync',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'butterchurn',
        'butterchurn-presets',
        '@wasm-audio-decoders/flac',
        '@wasm-audio-decoders/ogg-vorbis',
        '@wasm-audio-decoders/opus-ml'
      ],
      output: {
        globals: {
          butterchurn: 'butterchurn',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
