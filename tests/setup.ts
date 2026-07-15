// Vitest setup: override database config before tests run.
import process from 'process';

process.env.NODE_ENV = 'test';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3307';
process.env.DB_NAME = 'zekolah_test';
process.env.DB_USER = 'root';
process.env.DB_PASS = '';
process.env.JWT_SECRET = 'test-jwt-secret-key-not-real';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-not-real';

// Suppress pino logs during tests
import * as pino from 'pino';

const noopLogger = {
  fatal: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
  silent: () => {},
  child: () => noopLogger,
};

// Patch Pino global so Fastify won't spam the terminal
const originalPino = pino.default;
(pino as unknown as Record<string, unknown>).default = function (...args: unknown[]) {
  return noopLogger;
};

export const setup = () => {
  // No-op, but available for future setup hooks
};

export const teardown = () => {
  // Restore original pino
  (pino as unknown as Record<string, unknown>).default = originalPino;
};
