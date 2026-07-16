/* eslint-disable no-console */
/**
 * scripts/check-tables.js
 *
 * Verify that all expected tables from migrations exist in the database.
 *
 * Usage:
 *   node scripts/check-tables.js
 *   NODE_ENV=test node scripts/check-tables.js
 */
require('dotenv').config();
const path = require('path');
const Knex = require('knex');
const knexConfig = require('../knexfile');

// Expected tables derived from migrations/mysql/*.ts (filename prefix excluded)
const EXPECTED_TABLES = [
  'users',
  'schools',
  'academic_years',
  'teachers',
  'subjects',
  'classes',
  'students',
  'class_students',
  'teaching_assignments',
  'attendance',
  'grades',
  'assignments',
  'submissions',
  'refresh_tokens',
  'migrations', // tracking table managed by knex
];

async function main() {
  const env = process.env.NODE_ENV || 'development';
  const config = knexConfig()[env] || knexConfig();
  const knex = Knex(config);

  console.log(`\n🔍 Checking tables on env: ${env}`);
  console.log(`   Database: ${config.connection.database || config.connection.filename}\n`);

  try {
    const tables = await listTables(knex, config);
    console.log(`📋 Found ${tables.length} table(s):`);
    tables.sort().forEach((t) => console.log(`   • ${t}`));

    const expected = EXPECTED_TABLES.map((t) => t.toLowerCase());
    const actual = tables.map((t) => t.toLowerCase());

    const missing = expected.filter((t) => !actual.includes(t));
    const unexpected = actual.filter((t) => !expected.includes(t));

    console.log(`\n📐 Expected ${expected.length} table(s):`);
    EXPECTED_TABLES.forEach((t) => {
      const ok = actual.includes(t.toLowerCase());
      console.log(`   ${ok ? '✅' : '❌'} ${t}`);
    });

    if (unexpected.length > 0) {
      console.log(`\n⚠️  Unexpected tables (not in expected list):`);
      unexpected.forEach((t) => console.log(`   - ${t}`));
    }

    if (missing.length > 0) {
      console.log(`\n❌ Missing tables (${missing.length}):`);
      missing.forEach((t) => console.log(`   - ${t}`));
      process.exitCode = 1;
    } else {
      console.log(`\n✅ All expected tables present.`);
    }
  } catch (err) {
    console.error('❌ Check failed:', err.message);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
}

async function listTables(knex, config) {
  const client = config.client;
  if (client === 'mysql2' || client === 'mysql') {
    const rows = await knex.raw(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [config.connection.database]
    );
    // mysql2 returns [rows, fields]; pick the first array
    const rowsArr = Array.isArray(rows) ? rows[0] : rows;
    return rowsArr.map((r) => r.name || r.TABLE_NAME);
  }
  if (client === 'better-sqlite3' || client === 'sqlite3') {
    const rows = await knex.raw(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    // better-sqlite3 returns [{ name }]
    const rowsArr = Array.isArray(rows) ? rows[0] : rows;
    return rowsArr.map((r) => r.name).filter((n) => !n.startsWith('sqlite_'));
  }
  throw new Error(`Unsupported client: ${client}`);
}

main();