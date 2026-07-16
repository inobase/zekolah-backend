// =====================================================
// Migration: Create grades table (MySQL)
// Dependencies: students, subjects, academic_years, teachers
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('grades', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.integer('subject_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.string('assessment_type', 100).notNullable();
    table.decimal('score', 5, 2).notNullable();
    table.decimal('max_score', 5, 2).notNullable().defaultTo(100);
    table.integer('teacher_id').unsigned().nullable();
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('CASCADE');
    table.foreign('teacher_id').references('teachers.id').onDelete('SET NULL');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('grades');
}