// =====================================================
// Migration: Create users table
// =====================================================
// Core identity table. No foreign key dependencies.
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password', 255).notNullable();
    table.string('name', 200).notNullable();
    table.string('role', 50).defaultTo('student');
    table.string('phone', 20).nullable();
    table.string('avatar_url', 500).nullable();
    table.text('address').nullable();
    table.string('status', 20).defaultTo('active');
    table.dateTime('last_login').nullable();
    table.dateTime('email_verified_at').nullable();
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};