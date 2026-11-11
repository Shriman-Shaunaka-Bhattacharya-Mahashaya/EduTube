import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/App.jsx', 'src/components/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 75 },
    },
  },
});
