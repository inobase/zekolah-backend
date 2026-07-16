// =====================================================
// Migration: Create users table (MySQL)
// Core identity table. No foreign key dependencies.
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
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
    table.timestamp('last_login').nullable();
    table.timestamp('email_verified_at').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}