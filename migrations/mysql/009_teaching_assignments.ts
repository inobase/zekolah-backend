// =====================================================
// Migration: Create teaching_assignments table (MySQL)
// Dependencies: teachers, classes, subjects, academic_years
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('teaching_assignments', (table) => {
    table.increments('id').primary();
    table.integer('teacher_id').unsigned().notNullable();
    table.integer('class_id').unsigned().notNullable();
    table.integer('subject_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.foreign('teacher_id').references('teachers.id').onDelete('CASCADE');
    table.foreign('class_id').references('classes.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('CASCADE');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('teaching_assignments');
}