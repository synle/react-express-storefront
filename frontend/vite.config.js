import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the backend during development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        '**/*.test.*',
        'src/main.jsx',
        'src/index.jsx',
        'src/test-setup.js',
        '**/__tests__/**',
        'dist/**',
        'node_modules/**'
      ],
      // Floor-to-baseline thresholds. Measured on 2026-05-12:
      // statements 38.03, branches 70.51, functions 42.22, lines 38.03.
      // Raise as coverage improves.
      thresholds: {
        statements: 37,
        branches: 70,
        functions: 42,
        lines: 37
      }
    }
  }
});
