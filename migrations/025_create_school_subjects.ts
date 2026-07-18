// =====================================================
// Migration: Create school_subjects table
// School-level subjects adopted from school_specializations.
// School admins can customize name, code, jp_per_minggu.
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('school_subjects');
  if (exists) {
    // Table already exists from a failed migration — drop and recreate clean
    await knex.schema.dropTable('school_subjects');
  }

  await knex.schema.createTable('school_subjects', (table) => {
    table.increments('id').primary();
    table
      .integer('school_id')
      .unsigned()
      .notNullable();
    table
      .integer('specialization_id')
      .unsigned()
      .notNullable();
    table.string('name', 200).notNullable();
    table.string('code', 50).notNullable();
    table
      .enu('subject_type', ['UMUM', 'DD', 'DP', 'SP'], { useStrict: true })
      .notNullable()
      .defaultTo('UMUM');
    table.integer('jp_per_minggu').notNullable();
    table.integer('jp_per_semester').notNullable();
    table.integer('theory_hours').defaultTo(0);
    table.integer('practice_hours').defaultTo(0);
    table.boolean('customizable').defaultTo(true);
    table.timestamps(false, true);
  });

  // Add foreign keys after table creation (InnoDB compatibility)
  await knex.schema.table('school_subjects', (table) => {
    table
      .foreign('school_id')
      .references('id')
      .inTable('schools')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .foreign('specialization_id')
      .references('id')
      .inTable('specializations')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
  });

  // Indexes for fast lookups
  await knex.schema.table('school_subjects', (table) => {
    table.index('school_id');
    table.index(['school_id', 'name']);
    table.index(['school_id', 'code']);
    table.index('specialization_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('school_subjects');
}
