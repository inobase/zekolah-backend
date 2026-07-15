/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
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
