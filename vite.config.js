import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Web builds (Netlify, Vercel) use absolute paths.
// The Electron build loads from file://, so it needs relative paths and hash routing.
export default defineConfig(({ mode }) => ({
  base: mode === 'electron' ? './' : '/',
  plugins: [react()],
  define: { __HMS_TARGET__: JSON.stringify(mode === 'electron' ? 'electron' : 'web') },
  resolve: {
    alias: {
      '@ui': fileURLToPath(new URL('./src/shared/design-system/index.js', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@integrations': fileURLToPath(new URL('./src/integrations', import.meta.url)),
    },
  },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900 },
}))
