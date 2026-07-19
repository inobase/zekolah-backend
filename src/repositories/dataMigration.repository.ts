// =====================================================
// Data Migration Repository
// Utility for migrating legacy data to new school-level structures.
// Called once during setup, NOT via API endpoints.
// =====================================================

import { Knex } from 'knex'
import { AppError } from '../utils/AppError'

export class DataMigrationRepository {
  constructor(private knex: Knex) {}

  /**
   * Map teachers.specialization (varchar text) → school_specializations.id (FK numeric).
   * Best-effort: matches teacher's school_id against school_programs, then
   * matches specialization text against global specializations names.
   */
  async migrateTeachersSpecializationToSchoolSpecialization(): Promise<{ migrated: number; skipped: number }> {
    const hasSchoolSpecializations = await this.knex.schema.hasTable('school_specializations')
    if (!hasSchoolSpecializations) {
      return { migrated: 0, skipped: 1 }
    }

    let migrated = 0
    let skipped = 0

    // Get all teachers with non-null specialization
    const teachers = await this.knex('teachers')
      .whereNotNull('specialization')
      .andWhere('specialization', '!=', '')

    for (const teacher of teachers) {
      // Try to match by teacher's school
      const schoolPrograms = await this.knex('school_programs')
        .join('schools', 'school_programs.school_id', 'schools.id')
        .where('schools.id', teacher.school_id)
        .select('school_programs.id as school_program_id')

      if (schoolPrograms.length === 0) {
        skipped++
        continue
      }

      let found = false
      for (const sp of schoolPrograms) {
        // Find matching school_specialization by name
        const matchingSS = await this.knex('school_specializations')
          .join('specializations', 'school_specializations.specialization_id', 'specializations.id')
          .where('school_specializations.school_program_id', sp.school_program_id)
          .andWhereRaw('LOWER(TRIM(specializations.name)) = LOWER(?)', [teacher.specialization.trim()])
          .select('school_specializations.id as ss_id')
          .first()

        if (matchingSS) {
          await this.knex('teachers')
            .where('id', teacher.id)
            .update({ specialization: String(matchingSS.ss_id) })
          migrated++
          found = true
          break
        }
      }

      if (!found) skipped++
    }

    return { migrated, skipped }
  }

  /**
   * Copy existing subjects → school_subjects for schools that have activated programs.
   * Sets defaults: subject_type='UMUM', customizable=FALSE.
   */
  async migrateSubjectsToSchoolSubjects(): Promise<{ migrated: number; skipped: number }> {
    const hasSchoolSubjects = await this.knex.schema.hasTable('school_subjects')
    if (!hasSchoolSubjects) return { migrated: 0, skipped: 1 }

    const legacySubjects = await this.knex('subjects')
      .select('id', 'name', 'code', 'school_id')

    if (legacySubjects.length === 0) {
      return { migrated: 0, skipped: 0 }
    }

    // Get school_specializations grouped by school
    const schoolSpecMap = await this.knex('school_specializations')
      .join('school_programs', 'school_specializations.school_program_id', 'school_programs.id')
      .select('school_programs.school_id', 'school_specializations.id as spec_id')

    const specsBySchool: Record<number, number> = {}
    for (const row of schoolSpecMap) {
      if (!specsBySchool[row.school_id]) {
        specsBySchool[row.school_id] = row.spec_id
      }
    }

    const schoolSubjectRows = legacySubjects
      .filter((s) => specsBySchool[s.school_id])
      .map((subject: any) => ({
        school_id: subject.school_id,
        specialization_id: specsBySchool[subject.school_id],
        name: subject.name,
        code: subject.code,
        subject_type: 'UMUM',
        jp_per_minggu: 4,
        jp_per_semester: 72,
        theory_hours: 2,
        practice_hours: 2,
        customizable: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

    if (schoolSubjectRows.length > 0) {
      await this.knex('school_subjects').insert(schoolSubjectRows)
    }

    return {
      migrated: schoolSubjectRows.length,
      skipped: legacySubjects.length - schoolSubjectRows.length,
    }
  }

  /**
   * Run all data migrations in a single transaction.
   */
  async runAll(): Promise<{
    teachers: { migrated: number; skipped: number }
    subjects: { migrated: number; skipped: number }
  }> {
    return this.knex.transaction(async (trx) => {
      const teachers = new DataMigrationRepository(trx)
      const subjects = new DataMigrationRepository(trx)

      const teachersResult = await teachers.migrateTeachersSpecializationToSchoolSpecialization()
      const subjectsResult = await subjects.migrateSubjectsToSchoolSubjects()

      return { teachers: teachersResult, subjects: subjectsResult }
    })
  }
}
