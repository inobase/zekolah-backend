// =====================================================
// Migration: Create refresh_tokens table (MySQL)
// Dependencies: users
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('token', 500).unique().notNullable();
    table.timestamp('expires_at').notNullable();
    table.string('revoked_reason', 100).nullable();
    table.timestamp('revoked_at').nullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
}