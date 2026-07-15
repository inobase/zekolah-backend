// =====================================================
// Logger Utility (Simple Console-Based)
// Replace with pino in production
// =====================================================

export const logger = {
  info: (msg: string, meta?: unknown) => console.info('[INFO]', msg, meta || ''),
  warn: (msg: string, meta?: unknown) => console.warn('[WARN]', msg, meta || ''),
  error: (msg: string, meta?: unknown) => console.error('[ERROR]', msg, meta || ''),
  debug: (msg: string, meta?: unknown) => console.debug('[DEBUG]', msg, meta || ''),
};
