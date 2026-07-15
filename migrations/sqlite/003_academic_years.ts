// =====================================================
// Migration: Create academic_years table
// Dependencies: schools
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('academic_years', (table) => {
    table.increments('id').primary();
    table.integer('school_id').notNullable();
    table.string('year', 20).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('semester', 10).defaultTo('ganjil');
    table.string('status', 20).defaultTo('upcoming');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('academic_years');
};