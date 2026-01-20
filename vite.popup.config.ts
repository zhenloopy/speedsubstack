import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/popup/popup.ts'),
      name: 'SpeedSubstackPopup',
      formats: ['iife'],
      fileName: () => 'popup.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
