// Vitest setup: prepare SQLite test database.
import path from 'path';
import * as sqliteMigrations from '../migrations/sqlite';
import process from 'process';

// ---- Environment overrides ----
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'zekolah_test';
process.env.DB_USER = 'root';
process.env.DB_PASS = '';
process.env.JWT_SECRET = 'test-jwt-secret-key-not-real';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-not-real';

// Run SQLite schema migrations
export const setup = async () => {
  if (process.env.NODE_ENV !== 'test') return;

  const { getKnex } = await import('../src/config/database');
  const knex = getKnex();

  // Run migrations
  await sqliteMigrations.up(knex);
};
