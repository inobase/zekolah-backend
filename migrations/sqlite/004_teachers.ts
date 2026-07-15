// =====================================================
// Migration: Create teachers table
// Dependencies: users, schools
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('teachers', (table) => {
    table.increments('id').primary();
    table.string('nip', 100).unique().nullable();
    table.integer('user_id').notNullable().unique();
    table.string('specialization', 200).nullable();
    table.string('address').nullable();
    table.string('phone', 50).nullable();
    table.integer('school_id').notNullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('teachers');
};