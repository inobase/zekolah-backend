// =====================================================
// Migration: Create class_students table (MySQL)
// Dependencies: classes, students, academic_years
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('class_students', (table) => {
    table.increments('id').primary();
    table.integer('class_id').unsigned().notNullable();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.foreign('class_id').references('classes.id');
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('class_students');
}