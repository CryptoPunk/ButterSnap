import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  plugins: [
    UnoCSS(),
    dts({ rollupTypes: true })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ButterSync',
      fileName: 'index',
      formats: ['es'],
    },
    target: 'esnext',
    rollupOptions: {
      external: [], // Add external dependencies here
    },
    minify: 'esbuild', // Vite uses esbuild for minification by default
  },
  // Note: Vite 6 is moving towards Rolldown. 
  // Currently, it uses esbuild for dev/deps and Rollup for production builds.
  // When Rolldown is stable, it will replace Rollup.
});
