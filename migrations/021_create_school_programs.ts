// =====================================================
// Migration: Create school_programs table
// Links programs to schools — schools can offer programs that match their education_level.
// Managed by SCHOOL_ADMIN (per-school).
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('school_programs', (table) => {
    table.increments('id').primary();
    table
      .integer('school_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('schools')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .integer('program_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('programs')
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

  // Unique index: school can't activate the same program twice
  await knex.schema.table('school_programs', (table) => {
    table.unique(['school_id', 'program_id'], 'school_programs_school_program_unique');
    table.index('school_id');
    table.index('program_id');
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('school_programs');
}
