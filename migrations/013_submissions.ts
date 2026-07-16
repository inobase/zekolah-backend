// =====================================================
// Migration: Create submissions table (MySQL)
// Dependencies: assignments, students
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('submissions', (table) => {
    table.increments('id').primary();
    table.integer('assignment_id').unsigned().notNullable();
    table.integer('student_id').unsigned().notNullable();
    table.string('attachments', 500).nullable();
    table.text('comments').nullable();
    table.decimal('score', 5, 2).nullable();
    table.date('submitted_at').nullable();
    table.date('graded_at').nullable();
    table.string('status', 20).defaultTo('pending');
    table.foreign('assignment_id').references('assignments.id').onDelete('CASCADE');
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.index(['assignment_id', 'student_id']);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('submissions');
}