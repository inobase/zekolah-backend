// =====================================================
// Migration: Create subjects table (MySQL)
// Dependencies: schools
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('subjects', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('code', 50).notNullable();
    table.integer('school_id').unsigned().notNullable();
    table.foreign('school_id').references('schools.id');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('subjects');
}