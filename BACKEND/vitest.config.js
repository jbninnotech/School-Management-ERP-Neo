// vitest.config.js — Backend test configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    // Pattern to find test files
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    // Sequential to avoid DB race conditions
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
