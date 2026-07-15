// Test helper: build Fastify app, inject requests, cleanup after each test.
import { buildApp } from '../src/app';
import * as sqliteMigrations from '../migrations/001_create_base_tables_sqlite';

const openedApps: Awaited<ReturnType<typeof buildApp>>[] = [];

async function ensureSchema(knex: import('knex').Knex) {
  const exists = await knex.schema.hasTable('users');
  if (!exists) {
    await sqliteMigrations.up(knex);
  }
}

export async function createTestApp() {
  const app = await buildApp({ logger: false });

  const knexModule = await import('../src/config/database');
  const knex = knexModule.getKnex();
  await ensureSchema(knex);

  // Truncate all tables for isolation between tests.
  // Order matters due to FKs (children first).
  const tables = [
    'submissions',
    'assignments',
    'grades',
    'attendance',
    'teaching_assignments',
    'class_students',
    'teachers',
    'students',
    'subjects',
    'classes',
    'academic_years',
    'schools',
    'refresh_tokens',
    'users',
  ];
  for (const table of tables) {
    try {
      await knex(table).del();
    } catch {
      // ignore tables that don't exist yet
    }
  }

  openedApps.push(app);
  return app;
}

export async function closeAllApps() {
  for (const app of openedApps) {
    try {
      await app.close();
    } catch {
      // ignore close errors
    }
  }
  openedApps.length = 0;
}
