// =====================================================
// Migration: Create roles table (MySQL)
// Roles are global lookup. Seeded with 5 baseline roles.
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 50).unique().notNullable();
    table.string('description', 255).nullable();
    table.timestamps(true, true);
  });

  // Seed baseline roles
  await knex('roles').insert([
    {
      name: 'super_admin',
      description: 'Platform owner. Cross-school access via school_id = NULL.',
    },
    {
      name: 'admin',
      description: 'School administrator. Manages teachers, students, and academic config within a school.',
    },
    {
      name: 'staff',
      description: 'School operator (TU, kepsek). Limited admin actions within a school.',
    },
    {
      name: 'teacher',
      description: 'Teaching staff. Manages assignments, grades, attendance for assigned classes.',
    },
    {
      name: 'student',
      description: 'Enrolled student. Views own grades, assignments, attendance.',
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
}
