// =====================================================
// Migration: Create assignments table
// Dependencies: teachers, classes, subjects, academic_years
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('assignments', (table) => {
    table.increments('id').primary();
    table.integer('teacher_id').notNullable();
    table.integer('class_id').notNullable();
    table.integer('subject_id').notNullable();
    table.integer('academic_year_id').notNullable();
    table.string('title', 300).notNullable();
    table.text('description').nullable();
    table.date('due_date').notNullable();
    table.decimal('max_score', 5, 2).defaultTo('100');
    table.string('attachments', 500).nullable();
    table.foreign('teacher_id').references('teachers.id').onDelete('CASCADE');
    table.foreign('class_id').references('classes.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('CASCADE');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('assignments');
};