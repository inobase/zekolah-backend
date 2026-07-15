// =====================================================
// Migration: Add class_advisor_id to classes table
// =====================================================

import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Check if column already exists
  const hasColumn = await knex.schema.hasColumn('classes', 'class_advisor_id')
  if (!hasColumn) {
    await knex.schema.alterTable('classes', (table) => {
      table.integer('class_advisor_id').unsigned().nullable().after('vacancy')
      table.foreign('class_advisor_id').references('teachers.id')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('classes', 'class_advisor_id')
  if (hasColumn) {
    await knex.schema.alterTable('classes', (table) => {
      table.dropForeign('class_advisor_id')
      table.dropColumn('class_advisor_id')
    })
  }
}
