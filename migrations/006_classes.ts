// =====================================================
// Migration: Create classes table (MySQL)
// Dependencies: schools, academic_years, teachers
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('classes', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.string('grade', 5).notNullable();
    table.integer('vacancy').defaultTo(40);
    table.integer('class_advisor_id').unsigned().nullable();
    table.foreign('class_advisor_id').references('teachers.id');
    table.integer('academic_year_id').unsigned().notNullable();
    table.integer('school_id').unsigned().notNullable();
    table.foreign('academic_year_id').references('academic_years.id');
    table.foreign('school_id').references('schools.id');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('classes');
}