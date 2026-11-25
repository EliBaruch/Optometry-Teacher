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
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Keep each mini-game in an assets/minigames/ chunk so runtime error guards can attribute crashes.
        chunkFileNames: (chunk) =>
          chunk.facadeModuleId?.includes('/src/minigames/') ? 'assets/minigames/[name]-[hash].js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
  },
});
