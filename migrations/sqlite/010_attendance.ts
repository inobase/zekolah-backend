// =====================================================
// Migration: Create attendance table
// Dependencies: students, subjects
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('attendance', (table) => {
    table.increments('id').primary();
    table.integer('student_id').notNullable();
    table.integer('subject_id').notNullable();
    table.date('date').notNullable();
    table.string('status', 10).notNullable();
    table.string('reason').nullable();
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.index(['student_id', 'date']);
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('attendance');
};