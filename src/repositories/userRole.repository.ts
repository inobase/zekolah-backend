// =====================================================
// UserRole Repository — Data access layer for user_roles table
// =====================================================

import { Knex } from 'knex'
import { UserRole, UserRoleWithDetails, AssignRoleInput, ResolvedUserRole } from '../models/interfaces/RoleInterfaces'

export class UserRoleRepository {
  constructor(private knex: Knex) {}

  /** Get all active role assignments for a user */
  async findByUserId(userId: number): Promise<UserRole[]> {
    return (await this.knex('user_roles')
      .where({ user_id: userId })
      .select('*')
      .orderBy('created_at', 'desc')) as unknown as UserRole[]
  }

  /**
   * Get active role assignments for a user within a specific school
   * and/or academic year. Uses NULL-coalescing logic:
   *   - role with matching school_id + academic_year_id (most specific)
   *   - role with matching school_id + academic_year_id IS NULL (school-wide)
   *   - role with school_id IS NULL (cross-school/global)
   */
  async findActive(
    userId: number,
    schoolId: number | null,
    academicYearId: number | null
  ): Promise<ResolvedUserRole[]> {
    // Raw SQL — simpler and avoids Knex query builder edge cases.
    // schoolId may be NULL — the `?` binding handles it natively in MySQL.
    const result = await this.knex.raw(
      `
      SELECT
        r.name as role,
        ur.school_id,
        ur.academic_year_id,
        ur.is_active
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ? AND ur.is_active = 1
        AND (
          (ur.school_id = ? AND ur.academic_year_id = ?)
          OR (ur.school_id = ? AND ur.academic_year_id IS NULL)
          OR (ur.school_id IS NULL AND ur.academic_year_id IS NULL)
        )
      `,
      [userId, schoolId, academicYearId, schoolId]
    ) as any[]

    if (!Array.isArray(result[0])) return []
    const rows = result[0] as Array<{
      role: string
      school_id: number | null
      academic_year_id: number | null
      is_active: number | boolean
    }>

    // Deduplicate by role name (priority: exact > school > global)
    const seen = new Set<string>()
    return rows
      .filter((row) => {
        if (seen.has(row.role)) return false
        seen.add(row.role)
        return true
      })
      .map((row) => ({
        role: row.role,
        school_id: row.school_id,
        academic_year_id: row.academic_year_id,
        is_active: row.is_active === 1 || row.is_active === true,
      })) as ResolvedUserRole[]
  }

  /** Find a specific role assignment by id */
  async findById(id: number): Promise<UserRole | null> {
    const user = await this.knex('user_roles').where({ id }).first()
    return (user ?? null) as unknown as UserRole | null
  }

  /** Insert a role assignment */
  async insert(data: AssignRoleInput): Promise<number> {
    const [id] = await this.knex('user_roles').insert({
      ...data,
      school_id: data.school_id ?? null,
      academic_year_id: data.academic_year_id ?? null,
      is_active: true,
      granted_at: new Date().toISOString(),
    })
    return Number(id)
  }

  /** Deactivate a role assignment (soft remove) */
  async deactivate(userRoleId: number): Promise<void> {
    await this.knex('user_roles')
      .where({ id: userRoleId })
      .update({ is_active: false, updated_at: new Date() })
  }

  /** Delete a role assignment (hard remove) */
  async delete(userRoleId: number): Promise<void> {
    await this.knex('user_roles').where({ id: userRoleId }).del()
  }
}
