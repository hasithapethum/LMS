import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside React Server Components; tests import server code directly.
      'server-only': fileURLToPath(new URL('./tests/setup/empty-module.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/setup/integration-global.ts'],
    setupFiles: ['tests/setup/integration-env.ts'],
    fileParallelism: false,
  },
});
