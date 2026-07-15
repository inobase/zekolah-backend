/* eslint-disable no-console */
require('dotenv').config();
const Knex = require('knex');
const knexConfig = require('../knexfile');
const bcrypt = require('bcryptjs');

const command = process.argv[2];

async function runMigrationsLatest() {
  const env = process.env.NODE_ENV || 'development';
  const config = knexConfig()[env] || knexConfig();
  const knex = Knex(config);

  try {
    console.log('Running database migrations...');
    const result = await knex.migrate.latest();
    console.log(`✅ Migrations completed. Applied ${result.length} migration(s)`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await knex.destroy();
  }
}

async function rollBackMigrations() {
  const env = process.env.NODE_ENV || 'development';
  const config = knexConfig()[env] || knexConfig();
  const knex = Knex(config);

  try {
    console.log('Rolling back last migration...');
    await knex.migrate.rollback();
    console.log('✅ Rollback completed');
  } catch (err) {
    console.error('❌ Rollback failed:', err.message);
  } finally {
    await knex.destroy();
  }
}

async function runSeed() {
  const env = process.env.NODE_ENV || 'development';
  const config = knexConfig()[env] || knexConfig();
  const knex = Knex(config);

  try {
    // Clear existing seed data
    await knex('users').del();

    const ADMIN_PASSWORD = await bcrypt.hash('Admin@12345', 10);

    // Insert admin user
    await knex('users').insert({
      email: 'admin@zekolah.id',
      password: ADMIN_PASSWORD,
      name: 'Administrator',
      role: 'admin',
      status: 'active',
    });

    // Insert sample teacher
    await knex('users').insert({
      email: 'teacher@zekolah.id',
      password: ADMIN_PASSWORD,
      name: 'John Doe',
      role: 'teacher',
      status: 'active',
    });

    // Insert sample student
    await knex('users').insert({
      email: 'student@zekolah.id',
      password: ADMIN_PASSWORD,
      name: 'Jane Smith',
      role: 'student',
      status: 'active',
    });

    console.log('✅ Seeds completed');
    console.log('   - admin@zekolah.id');
    console.log('   - teacher@zekolah.id');
    console.log('   - student@zekolah.id');
    console.log('   Password: Admin@12345');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await knex.destroy();
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