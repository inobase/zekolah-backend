// =====================================================
// Migration: Create attendance table (MySQL)
// Dependencies: students, subjects
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.integer('subject_id').unsigned().notNullable();
    table.date('date').notNullable();
    table.string('status', 10).notNullable();
    table.string('reason').nullable();
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.index(['student_id', 'date']);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance');
}