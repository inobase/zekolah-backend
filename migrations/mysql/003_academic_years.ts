// =====================================================
// Migration: Create academic_years table (MySQL)
// Dependencies: schools
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('academic_years', (table) => {
    table.increments('id').primary();
    table.integer('school_id').unsigned().notNullable();
    table.string('year', 20).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('semester', 10).defaultTo('ganjil');
    table.string('status', 20).defaultTo('upcoming');
    table.foreign('school_id').references('schools.id');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('academic_years');
}