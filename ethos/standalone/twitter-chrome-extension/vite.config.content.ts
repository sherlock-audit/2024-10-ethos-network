import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Prevent clearing the output directory
    rollupOptions: {
      input: {
        content: './src/content/index.ts',
      },
      output: {
        format: 'iife', // Set the format to IIFE
        entryFileNames: `[name].js`,
      },
    },
  },
})
