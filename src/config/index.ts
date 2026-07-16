// =====================================================
// Application Configuration
// Loads from environment variables with defaults
// =====================================================

import path from 'path';

function loadEnv(): void {
  // dotenv is loaded in index.ts; we ensure all vars exist here
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
  if (!process.env.PORT) {
    process.env.PORT = '3000';
  }
  if (!process.env.DB_HOST) {
    process.env.DB_HOST = 'localhost';
  }
  if (!process.env.DB_PORT) {
    process.env.DB_PORT = '3306';
  }
  if (!process.env.DB_NAME) {
    process.env.DB_NAME = process.env.NODE_ENV === 'test' ? 'zekolah-test' : 'zekolah';
  }
}

loadEnv();

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT || '3306', 10),
  dbName: process.env.DB_NAME || 'zekolah',
  dbUser: process.env.DB_USER || 'root',
  dbPass: process.env.DB_PASS || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'changeme-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'changeme-refresh-secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Auth
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  // CORS
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(','),

  // Logging
  logLevel: (process.env.LOG_LEVEL || 'info') as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent',

  // Uploads
  uploadDir: path.resolve(__dirname, '../../uploads'),
  maxUploadSize: 5 * 1024 * 1024, // 5MB
} as const;
