// Test helper: build Fastify app, inject requests, cleanup after each test.
import { buildApp } from '../src/app';

const openedApps: Awaited<ReturnType<typeof buildApp>>[] = [];

async function ensureSchema(knex: import('knex').Knex) {
  const exists = await knex.schema.hasTable('users');
  if (!exists) {
    await knex.migrate.latest();
  }
}

export async function createTestApp() {
  const app = await buildApp({ logger: false });

  const knexModule = await import('../src/config/database');
  const knex = knexModule.getKnex();
  await ensureSchema(knex);

  // Truncate all tables for isolation between tests.
  // Disable foreign key checks to avoid FK constraint violations on MySQL.
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'refresh_tokens',
    'user_roles',
    'user_schools',
    'submissions',
    'assignments',
    'grades',
    'attendance',
    'teaching_assignments',
    'class_students',
    'teachers',
    'students',
    'classes',
    'class_subjects',
    'subjects',
    'academic_years',
    'schools',
    'users',
  ];
  for (const table of tables) {
    try {
      await knex.raw(`TRUNCATE TABLE \`${table}\``);
    } catch {
      // ignore tables that don't exist yet
    }
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

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
