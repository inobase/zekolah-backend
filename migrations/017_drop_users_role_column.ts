// =====================================================
// Migration: Drop users.role column (Phase 5 deprecation)
//
// Depends on: user_roles table (016) with migrated data
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop the legacy role column from users table.
  // All role data has been migrated to user_roles table.
  // Fallback logic in requireRole.ts has been removed.
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Re-add the role column for rollback
  await knex.schema.alterTable('users', (table) => {
    table.string('role', 50).defaultTo('student');
  });
}