// =====================================================
// Migration: Create grades table
// Dependencies: students, subjects, academic_years, teachers
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('grades', (table) => {
    table.increments('id').primary();
    table.integer('student_id').notNullable();
    table.integer('subject_id').notNullable();
    table.integer('academic_year_id').notNullable();
    table.string('assessment_type', 100).notNullable();
    table.decimal('score', 5, 2).notNullable();
    table.decimal('max_score', 5, 2).notNullable().defaultTo(100);
    table.integer('teacher_id').nullable();
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('CASCADE');
    table.foreign('teacher_id').references('teachers.id').onDelete('SET NULL');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('grades');
};