// =====================================================
// Migration: Create submissions table
// Dependencies: assignments, students
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('submissions', (table) => {
    table.increments('id').primary();
    table.integer('assignment_id').notNullable();
    table.integer('student_id').notNullable();
    table.string('attachments', 500).nullable();
    table.text('comments').nullable();
    table.decimal('score', 5, 2).nullable();
    table.date('submitted_at').nullable();
    table.date('graded_at').nullable();
    table.string('status', 20).defaultTo('pending');
    table.foreign('assignment_id').references('assignments.id').onDelete('CASCADE');
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.index(['assignment_id', 'student_id']);
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('submissions');
};