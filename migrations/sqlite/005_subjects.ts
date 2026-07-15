// =====================================================
// Migration: Create subjects table
// Dependencies: schools
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('subjects', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('code', 50).notNullable();
    table.integer('school_id').notNullable();
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('subjects');
};