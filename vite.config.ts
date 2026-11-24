/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Relative base so the build works on GitHub Pages, Netlify, or any sub-path.
  base: './',
  plugins: [preact()],
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@ui-kit': r('./src/ui-kit'),
      '@render': r('./src/render'),
      '@audio': r('./src/audio'),
      '@learning': r('./src/learning'),
    },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
  },
});
