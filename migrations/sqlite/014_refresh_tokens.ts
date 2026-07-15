// =====================================================
// Migration: Create refresh_tokens table
// Dependencies: users
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('token', 500).unique().notNullable();
    table.dateTime('expires_at').notNullable();
    table.string('revoked_reason', 100).nullable();
    table.dateTime('revoked_at').nullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
};