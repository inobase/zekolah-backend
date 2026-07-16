// =====================================================
// Migration: Create schools table (MySQL)
// Tenant root table; most other entities FK into it.
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schools', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('code', 50).unique().notNullable();
    table.string('email', 255).nullable();
    table.string('phone', 20).nullable();
    table.string('address').nullable();
    table.string('city', 100).nullable();
    table.string('province', 100).nullable();
    table.string('logo_url', 500).nullable();
    table.string('status', 20).defaultTo('active');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schools');
}