/* eslint-disable no-console */
require('dotenv').config();
const knex = require('knex').default;
const knexConfig = require('../knexfile');

const command = process.argv[2];

async function runMigrationsLatest() {
  const env = process.env.NODE_ENV || 'development';
  const config = knexConfig()[env] || knexConfig();
  const db = knex(config);

  try {
    console.log('Running database migrations...');
    const result = await db.migrate.latest();
    console.log(`✅ Migrations completed. Applied ${result.length} migration(s)`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await db.destroy();
  }
}

async function rollBackMigrations() {
  const env = process.env.NODE_ENV || 'development';
  const config = knexConfig()[env] || knexConfig();
  const db = knex(config);

  try {
    console.log('Rolling back last migration...');
    await db.migrate.rollback();
    console.log('✅ Rollback completed');
  } catch (err) {
    console.error('❌ Rollback failed:', err.message);
  } finally {
    await db.destroy();
  }
}

async function runSeed() {
  const env = process.env.NODE_ENV || 'development';
  const config = knexConfig()[env] || knexConfig();
  const db = knex(config);

  try {
    await db.seed.run();

    console.log('✅ Seeds completed');
    console.log('   - admin@zekolah.id');
    console.log('   - teacher@zekolah.id');
    console.log('   - student@zekolah.id');
    console.log('   Password: Admin@12345');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await db.destroy();
  }
}

async function main() {
  switch (command) {
    case 'latest':
      await runMigrationsLatest();
      break;
    case 'rollback':
      await rollBackMigrations();
      break;
    case 'seed':
      await runSeed();
      break;
    default:
      console.log('Usage: node scripts/migrate.js [latest|rollback|seed]');
      console.log('');
      console.log('Commands:');
      console.log('  latest  - Run all pending migrations');
      console.log('  rollback- Rollback last migration');
      console.log('  seed    - Seed database with initial data');
      break;
  }
}

main();