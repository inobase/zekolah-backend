// =====================================================
// Migration: Add education_level column to schools table
// Enum values follow Kemendikbud classification for education institutions.
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add education_level ENUM column (default SMK/MAK = '3B')
  await knex.schema.alterTable('schools', (table) => {
    table
      .enu('education_level', ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '5B'], {
        useSpecificColors: false,
      })
      .notNullable()
      .defaultTo('3B')
      .after('province');
  });

  // Index for filtering
  await knex.raw('ALTER TABLE schools ADD INDEX education_level_idx (education_level)');

  // Seed: update existing schools to '3B' (SMK) as default
  await knex('schools').update({ education_level: '3B' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX education_level_idx ON schools');
  await knex.schema.alterTable('schools', (table) => {
    table.dropColumn('education_level');
  });
}
