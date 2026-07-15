// =====================================================
// Migration: Create teachers table (MySQL)
// Dependencies: users, schools
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('teachers', (table) => {
    table.increments('id').primary();
    table.string('nip', 100).unique().nullable();
    table.integer('user_id').unsigned().notNullable().unique();
    table.string('specialization', 200).nullable();
    table.string('address').nullable();
    table.string('phone', 50).nullable();
    table.integer('school_id').unsigned().notNullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('school_id').references('schools.id');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('teachers');
}