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
      include: ['./src/**/*.{html,js,ts,jsx,tsx}'],
    },
  },
  shortcuts: [
    ['icon-play', 'i-ph:play-fill'],
    ['icon-pause', 'i-ph:pause-fill'],
    ['icon-shuffle', 'i-ph:shuffle-bold'],
    ['icon-prev', 'i-ph:skip-back-fill'],
    ['icon-next', 'i-ph:skip-forward-fill'],
    ['icon-loop-none', 'i-ph:prohibit-bold'],
    ['icon-loop-track', 'i-ph:repeat-once-bold'],
    ['icon-loop-playlist', 'i-ph:repeat-bold'],
    ['icon-gear', 'i-ph:gear-six-fill'],
    ['icon-close', 'i-ph:x-bold'],
    ['icon-fullscreen', 'i-ph:corners-out-bold'],
    ['icon-windowed', 'i-ph:corners-in-bold'],
    ['icon-volume', 'i-ph:speaker-high-fill'],

    // UI components
    ['glass-panel', 'bg-glass backdrop-blur-2xl border-1 border-white/12 rounded-3xl shadow-2xl transition-all duration-600'],
    ['icon-btn', 'bg-white/5 w-12 h-12 flex items-center justify-center rounded-full border-1 border-white/10 text-white hover:(bg-white/15 scale-110 border-accent-secondary shadow-[0_0_15px_rgba(0,229,255,0.3)]) transition-all duration-200'],
    ['icon-btn-active', 'text-accent-secondary border-accent-secondary bg-accent-secondary/10 shadow-[0_0_10px_rgba(0,229,255,0.2)]'],
  ],
  theme: {
    colors: {
      accent: {
        primary: 'var(--accent-primary)',
        secondary: 'var(--accent-secondary)',
      },
      glass: 'var(--panel-bg)',
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
