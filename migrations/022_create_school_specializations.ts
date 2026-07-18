// =====================================================
// Migration: Create school_specializations table
// Links specializations to school_programs — schools can offer specializations from their activated programs.
// Managed by SCHOOL_ADMIN (per-school).
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('school_specializations', (table) => {
    table.increments('id').primary();
    table
      .integer('school_program_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('school_programs')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .integer('specialization_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('specializations')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('activated_at').nullable();
    table
      .integer('activated_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');
    table.timestamps(false, true);
  });

  // Unique index: school program can't activate the same specialization twice
  await knex.schema.table('school_specializations', (table) => {
    table.unique(['school_program_id', 'specialization_id'], 'school_spec_school_program_spec_unique');
    table.index('school_program_id');
    table.index('specialization_id');
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('school_specializations');
}
