# ButterSync — Issues

## Open

- **`@fontsource/outfit` type warning**: Side-effect import in `src/main.ts` raises a TS2882 error during declaration file generation despite being a CSS-only package. Need to add a custom `.d.ts` declaration to suppress this lint in the distribution bundle.
