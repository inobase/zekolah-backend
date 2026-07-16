// =====================================================
// Migration: Create user_roles table (MySQL)
// Scoped role assignments: user + role + school + academic_year
//
// Depends on: users, roles (015), schools, academic_years
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // --- Create table ---
  await knex.schema.createTable('user_roles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('role_id').unsigned().notNullable();
    table.integer('school_id').unsigned().nullable();  // NULL = cross-school
    table.integer('academic_year_id').unsigned().nullable();  // NULL = all TA
    table.boolean('is_active').defaultTo(true);
    table.timestamp('granted_at').nullable();
    table.integer('granted_by').unsigned().nullable();  // who granted this assignment

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('role_id').references('roles.id');
    table.foreign('school_id').references('schools.id').onDelete('SET NULL');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('SET NULL');
    table.foreign('granted_by').references('users.id').onDelete('SET NULL');

    // Unique scoped constraint
    table.unique(['user_id', 'role_id', 'school_id', 'academic_year_id']);

    table.timestamps(true, true);
  });

  // --- Composite indexes for performance ---
  // Resolve active roles for a user (most frequent query)
  await knex.schema.table('user_roles', (t) => {
    t.index(['user_id', 'school_id', 'academic_year_id', 'is_active']);
  });
  // Filter by role
  await knex.schema.table('user_roles', (t) => {
    t.index(['role_id', 'school_id', 'is_active']);
  });

  // --- Migrate existing data ---
  await migrateExistingData(knex);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles');
}

/**
 * Migrate existing user role assignments from:
 *   1. users.role (direct role)
 *   2. teachers.school_id (teacher in a school)
 *   3. students.school_id (student in a school)
 */
async function migrateExistingData(knex: Knex): Promise<void> {
  // Get role name → id mapping
  const roles = await knex('roles').select('id', 'name');
  const roleIdMap = Object.fromEntries(roles.map((r: { id: number; name: string }) => [r.name, r.id]));

  // 1. Migrate teachers → user_roles with teacher role
  //    school_id from teachers.school_id
  const teachers = await knex('teachers')
    .select('user_id', 'school_id');

  for (const t of teachers) {
    await knex('user_roles').insert({
      user_id: t.user_id,
      role_id: roleIdMap['teacher'] ?? null,
      school_id: t.school_id,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    }).onConflict(['user_id', 'role_id', 'school_id', 'academic_year_id'])
      .ignore();
  }

  // 2. Migrate students → user_roles with student role
  //    school_id from students.school_id
  const students = await knex('students')
    .select('user_id', 'school_id');

  for (const s of students) {
    await knex('user_roles').insert({
      user_id: s.user_id,
      role_id: roleIdMap['student'] ?? null,
      school_id: s.school_id,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    }).onConflict(['user_id', 'role_id', 'school_id', 'academic_year_id'])
      .ignore();
  }

  // 3. Migrate standalone users.role that didn't come from teachers/students
  //    (e.g., admin users)
  //    Use raw query to avoid Knex builder chaining issues with andWhereNotIn
  const otherUsers = await knex.raw(`
    SELECT id, role, NOW() as granted_at
    FROM users
    WHERE id NOT IN (SELECT user_id FROM teachers)
      AND id NOT IN (SELECT user_id FROM students)
  `);

  for (const u of otherUsers[0] as Array<{ id: number; role: string; granted_at: string }>) {
    const roleName = u.role?.toLowerCase();
    if (roleName && roleIdMap[roleName]) {
      await knex('user_roles').insert({
        user_id: u.id,
        role_id: roleIdMap[roleName],
        school_id: null,  // global role
        academic_year_id: null,
        is_active: true,
        granted_at: u.granted_at,
      }).onConflict(['user_id', 'role_id', 'school_id', 'academic_year_id'])
        .ignore();
    }
  }
}
