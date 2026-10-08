import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // Integration tests share one PostgreSQL database, so run files sequentially.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
