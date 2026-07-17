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
  async insert(data: AssignRoleInput): Promise<UserRole> {
    const [id] = await this.knex('user_roles').insert({
      ...data,
      school_id: data.school_id ?? null,
      academic_year_id: data.academic_year_id ?? null,
      is_active: true,
      granted_at: new Date().toISOString(),
    })
    return (await this.knex('user_roles').where({ id }).first()) as unknown as UserRole
  }

  /** Find all active role assignments for a user with role details */
  async findAllForUser(
    userId: number,
    isActive: boolean | null = null
  ): Promise<UserRoleWithDetails[]> {
    const q = this.knex('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select(
        'user_roles.*',
        'roles.name as role_name',
        'roles.description as role_description'
      )
      .orderBy('user_roles.created_at', 'desc')

    if (isActive !== null) {
      q.andWhere('user_roles.is_active', isActive)
    }

    return (await q) as unknown as UserRoleWithDetails[]
  }

  /** Find all role assignments within a school (admin view) */
  async findAllScoped(
    schoolId: number,
    opts: {
      userId?: number
      isActive?: boolean | null
    } = {}
  ): Promise<UserRoleWithDetails[]> {
    const q = this.knex('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.school_id', schoolId)
      .select(
        'user_roles.*',
        'roles.name as role_name',
        'roles.description as role_description'
      )
      .orderBy('user_roles.created_at', 'desc')

    if (opts.userId !== undefined) {
      q.andWhere('user_roles.user_id', opts.userId)
    }
    if (opts.isActive !== null) {
      q.andWhere('user_roles.is_active', opts.isActive)
    }

    return (await q) as unknown as UserRoleWithDetails[]
  }

  /** Find a role assignment by user_id, role_id, school_id, academic_year_id */
  async findByAssignment(
    userId: number,
    roleId: number,
    schoolId: number | null,
    academicYearId: number | null
  ): Promise<UserRole | null> {
    const where: Record<string, unknown> = {
      user_id: userId,
      role_id: roleId,
    }
    if (schoolId !== null) where.school_id = schoolId
    else where.school_id = null
    if (academicYearId !== null) where.academic_year_id = academicYearId
    else where.academic_year_id = null

    const row = await this.knex('user_roles').where(where).first()
    return (row ?? null) as unknown as UserRole | null
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
