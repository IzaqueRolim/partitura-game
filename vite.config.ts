import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`        → site normal (pasta dist/)
// `npm run build:single` → um único index.html com tudo embutido (demo/offline)
export default defineConfig(({ mode }) => ({
  base: './', // caminhos relativos: funciona no Capacitor e em qualquer subpasta
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 1200, outDir: mode === 'single' ? 'dist-single' : 'dist' },
}))
