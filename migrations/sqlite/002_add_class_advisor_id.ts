// =====================================================
// Migration: Add class_advisor_id to classes table (SQLite)
// =====================================================

export async function up(knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('classes');
  if (!hasTable) return;
  
  const hasColumn = await knex.schema.hasColumn('classes', 'class_advisor_id');
  if (hasColumn) return;

  await knex.schema.alterTable('classes', (table) => {
    table.integer('class_advisor_id').nullable();
    table.foreign('class_advisor_id').references('teachers.id');
  });
}

export async function down(knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('classes');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('classes', 'class_advisor_id');
  if (!hasColumn) return;

  await knex.schema.alterTable('classes', (table) => {
    table.dropForeign('class_advisor_id');
    table.dropColumn('class_advisor_id');
  });
}
