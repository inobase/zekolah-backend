// =====================================================
// Role Resolver Utility
// Resolves active roles for a user based on school and academic year.
// =====================================================

import { RoleRepository } from '../repositories/role.repository'
import { UserRoleRepository } from '../repositories/userRole.repository'
import { ResolvedUserRole, AugmentedUser } from '../models/interfaces/RoleInterfaces'

export class RoleResolver {
  constructor(
    private roleRepo: RoleRepository,
    private userRoleRepo: UserRoleRepository
  ) {}

  /**
   * Resolve active roles for a user within a school context.
   *
   * Priority:
   *   1. Exact school_id + academic_year_id match
   *   2. Matching school_id (any TA) — school-wide
   *   3. NULL school_id (cross-school/global)
   */
  async resolve(
    userId: number,
    schoolId: number | null,
    academicYearId: number | null
  ): Promise<ResolvedUserRole[]> {
    return this.userRoleRepo.findActive(userId, schoolId, academicYearId)
  }

  /**
   * Build augmented user object from user + resolved roles.
   * Called by auth middleware after JWT verification.
   */
  buildAugmentedUser(
    userId: number,
    email: string,
    name: string | undefined,
    legacyRole: string | undefined,
    roles: ResolvedUserRole[],
    schoolId: number | null,
    academicYearId: number | null
  ): AugmentedUser {
    return {
      id: userId,
      email,
      name,
      role: legacyRole,  // kept for transition period
      roles,
      activeSchoolId: schoolId,
      activeAcademicYearId: academicYearId,
    }
  }

  /**
   * Convenience: check if any of the resolved roles matches.
   */
  hasAnyRole(roles: ResolvedUserRole[], roleNames: string[]): boolean {
    const lower = new Set(roleNames.map(r => r.toLowerCase()))
    return roles.some(r => lower.has(r.role.toLowerCase()))
  }

  /**
   * Convenience: check if ALL required roles are present.
   * For role-based access, typically ANY match is enough (OR logic),
   * but this is provided if AND logic is ever needed.
   */
  hasAllRoles(roles: ResolvedUserRole[], roleNames: string[]): boolean {
    const lower = new Set(roleNames.map(r => r.toLowerCase()))
    const userRoles = new Set(roles.map(r => r.role.toLowerCase()))
    return [...lower].every(r => userRoles.has(r))
  }
}
