// =====================================================
// Migration: Create schools table
// =====================================================
// Tenant root table; most other entities FK into it.
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('schools', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('code', 50).unique().notNullable();
    table.string('email', 255).nullable();
    table.string('phone', 20).nullable();
    table.string('address').nullable();
    table.string('city', 100).nullable();
    table.string('province', 100).nullable();
    table.string('logo_url', 500).nullable();
    table.string('status', 20).defaultTo('active');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('schools');
};