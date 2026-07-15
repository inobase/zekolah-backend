// =====================================================
// Migration: Create classes table
// Dependencies: schools, academic_years, teachers
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('classes', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.string('grade', 5).notNullable();
    table.integer('vacancy').defaultTo(40);
    table.integer('class_advisor_id').nullable();
    table.foreign('class_advisor_id').references('teachers.id');
    table.integer('academic_year_id').notNullable();
    table.integer('school_id').notNullable();
    table.foreign('academic_year_id').references('academic_years.id');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('classes');
};