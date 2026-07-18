// Test helper: build Fastify app, inject requests, cleanup after each test.
import { buildApp } from '../src/app';

const openedApps: Awaited<ReturnType<typeof buildApp>>[] = [];

async function ensureSchema(knex: import('knex').Knex) {
  const exists = await knex.schema.hasTable('users');
  if (!exists) {
    await knex.migrate.latest();
  }

  // Ensure migration 018 (education_level) is applied to the test DB.
  // The regular migrate.latest() is skipped when 'users' table exists,
  // so new migration files won't run automatically. We apply it manually.
  // Use SHOW COLUMNS to check if the column already exists.
  const cols = await knex.raw(
    'SHOW COLUMNS FROM schools LIKE ?', ['education_level']
  );
  const hasColumn = Array.isArray(cols[0]) && cols[0].length > 0;

  if (!hasColumn) {
    // Column doesn't exist — add it.
    await knex.schema.alterTable('schools', (table) => {
      table
        .enu('education_level', ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '5B'], {
          useSpecificColors: false,
        })
        .notNullable()
        .defaultTo('3B')
        .after('province');
    });
    await knex.raw('ALTER TABLE schools ADD INDEX education_level_idx (education_level)');
    await knex('schools').update({ education_level: '3B' });

    // Record migration in migrations table so Knex thinks it's applied.
    const maxBatchRow: any = await knex('migrations').max('batch as mb').first();
    const batch = (maxBatchRow?.mb || 0) + 1;
    await knex('migrations').insert({
      migration: '018_add_education_level_to_schools.ts',
      batch,
      migrated_at: new Date(),
    });
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
