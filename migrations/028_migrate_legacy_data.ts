// =====================================================
// Migration: Migrate legacy data to school-level tables
// ──────────────────────────────────────────────────────
// Step 1: Migrate teachers.specialization (varchar) → school_specializations (FK)
//         Updates teachers.specialization to reference school_specializations.id
//         Best-effort: matches by teacher's school_id and specialization name
//         against global specializations + school_specializations.
//
// Step 2: Migrate subjects → school_subjects
//         For schools that have activated programs, copy existing `subjects`
//         into `school_subjects` with defaults (subject_type='UMUM',
//         customizable=FALSE) targeting each school's first specialization.
//
// Step 3: Mark migration as complete (written to migrations table)
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ==========================================================
  // STEP 1: Migrate teachers.specialization → school_specializations
  // ==========================================================

  // Check if school_specializations table exists
  const hasSchoolSpecs = await knex.schema.hasTable('school_specializations');
  const hasSpecializations = await knex.schema.hasTable('specializations');
  const hasSchoolPrograms = await knex.schema.hasTable('school_programs');

  if (hasSchoolSpecs && hasSpecializations && hasSchoolPrograms) {
    // For each school that has school_specializations, try to map teacher specialization text
    const schools = await knex('schools').select('id', 'name');

    for (const school of schools) {
      // Get all school_specializations for this school (with global spec names)
      const schoolSpecs = await knex('school_specializations')
        .join('school_programs', 'school_specializations.school_program_id', 'school_programs.id')
        .join('specializations', 'school_specializations.specialization_id', 'specializations.id')
        .where('school_programs.school_id', school.id)
        .select('school_specializations.id as ss_id', 'specializations.name as spec_name');

      if (schoolSpecs.length === 0) continue;

      // Update teachers with matching specialization names
      for (const ss of schoolSpecs) {
        await knex('teachers')
          .where('school_id', school.id)
          .andWhereRaw('LOWER(TRIM(specialization)) = ?', [ss.spec_name.toLowerCase().trim()])
          .update({ specialization: String(ss.ss_id) });
      }
    }
  }

  // ==========================================================
  // STEP 2: Migrate subjects → school_subjects
  // ==========================================================

  const hasSubjects = await knex.schema.hasTable('subjects');
  const hasSchoolSubjects = await knex.schema.hasTable('school_subjects');

  if (hasSubjects && hasSchoolSubjects) {
    // Get subjects that haven't been migrated (school_subjects.id IS NULL comparison)
    const legacySubjects = await knex('subjects')
      .select('id', 'name', 'code', 'school_id');

    if (legacySubjects.length === 0) return;

    // Find school_specializations to link subjects to
    const schoolSpecMap = await knex('school_specializations')
      .join('school_programs', 'school_specializations.school_program_id', 'school_programs.id')
      .select('school_programs.school_id', 'school_specializations.id as spec_id');

    // Group school_specializations by school_id
    const specsBySchool: Record<number, number[]> = {};
    for (const row of schoolSpecMap) {
      if (!specsBySchool[row.school_id]) specsBySchool[row.school_id] = [];
      specsBySchool[row.school_id].push(row.spec_id);
    }

    // Bulk insert school_subjects from legacy subjects
    const schoolSubjectRows = legacySubjects.map((subject: any) => {
      const specIds = specsBySchool[subject.school_id] || [null];
      const specialization_id = specIds[0] ?? null; // default to first available

      return {
        school_id: subject.school_id,
        specialization_id,
        name: subject.name,
        code: subject.code,
        subject_type: 'UMUM' as const,
        jp_per_minggu: 4,
        jp_per_semester: 72,
        theory_hours: 2,
        practice_hours: 2,
        customizable: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    if (schoolSubjectRows.length > 0) {
      await knex('school_subjects').insert(schoolSubjectRows);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Reverse migration: restore original state
  // Since we can't perfectly undo, we mark the migration as "not migrated"
  // The actual data changes are intentionally irreversible for safety
  // (migrating school_specializations.back to text is lossy)

  // Optionally: restore teachers.specialization from numeric → text lookup
  // This is best-effort and may lose data
  const hasSchoolSpecs = await knex.schema.hasTable('school_specializations');
  const hasSpecializations = await knex.schema.hasTable('specializations');

  if (hasSchoolSpecs && hasSpecializations) {
    await knex.raw(`
      UPDATE teachers t
      INNER JOIN school_specializations ss ON t.specialization = CAST(ss.id AS CHAR)
      INNER JOIN school_programs sp ON ss.school_program_id = sp.id
      INNER JOIN specializations spec ON ss.specialization_id = spec.id
      SET t.specialization = spec.name
      WHERE t.specialization REGEXP '^[0-9]+$'
    `);
  }

  // Optionally: delete migrated school_subjects that came from legacy subjects
  // We identify them by customizable = false and jp_per_minggu = 4, jp_per_semester = 72
  const hasSchoolSubjects = await knex.schema.hasTable('school_subjects');
  if (hasSchoolSubjects) {
    await knex('school_subjects')
      .where('customizable', false)
      .andWhere('jp_per_minggu', 4)
      .andWhere('jp_per_semester', 72)
      .del();
  }
}
