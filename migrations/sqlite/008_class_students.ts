// =====================================================
// Migration: Create class_students table (junction)
// Dependencies: classes, students, academic_years
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('class_students', (table) => {
    table.increments('id').primary();
    table.integer('class_id').notNullable();
    table.integer('student_id').notNullable();
    table.integer('academic_year_id').notNullable();
    table.foreign('class_id').references('classes.id');
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('class_students');
};