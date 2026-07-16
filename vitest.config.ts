/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    teardownFiles: [],
    // Run tests serially across files because they all share a single
    // MySQL test database. Parallel test files would race on truncate.
    fileParallelism: false,
    // Silence pino/console output during tests
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,js}'],
      exclude: [
        'src/index.ts',
        '**/*.d.ts',
        '**/migrations/**',
        '**/seeds/**',
        '**/scripts/**',
      ],
    },
  },
});
