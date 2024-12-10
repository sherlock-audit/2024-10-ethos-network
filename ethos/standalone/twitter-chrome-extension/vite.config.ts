import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: {
        index: './index.html',
        background: './src/background/index.ts',
      },
      output: {
        chunkFileNames: `chunk_[name].js`,
        entryFileNames: `[name].js`,
      },
    },
  },
})
