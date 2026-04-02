import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  content: {
    pipeline: {
      include: ['./src/**/*.{html,js,ts,jsx,tsx,svelte}'],
    },
  },
  safelist: [
    'icon-play', 'icon-pause', 'icon-shuffle', 'icon-prev', 'icon-next',
    'icon-loop-none', 'icon-loop-track', 'icon-loop-playlist',
    'icon-gear', 'icon-close', 'icon-fullscreen', 'icon-windowed', 'icon-volume',
    'icon-btn',
  ],
  shortcuts: [


    // UI components
    ['glass-panel', 'bg-glass backdrop-blur-3xl border-1 border-white/8 rounded-3xl shadow-2xl transition-all duration-600'],
    ['icon-btn', 'bg-white/5 w-12 h-12 flex items-center justify-center rounded-full border-1 border-white/8 text-white hover:(bg-accent-primary scale-110 border-transparent shadow-[0_0_20px_var(--accent-glow)]) transition-all duration-200'],
    ['icon-btn-active', 'text-black border-transparent bg-accent-secondary shadow-[0_0_15px_rgba(6,182,212,0.4)]'],
  ],
  theme: {
    colors: {
      accent: {
        primary: 'var(--accent-primary)',
        secondary: 'var(--accent-secondary)',
      },
      glass: 'var(--glass-bg)',
    },
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
