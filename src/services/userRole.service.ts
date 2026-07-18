// =====================================================
// Role Assignment Service — business logic for user_roles
// =====================================================

import { Knex } from 'knex'
import { AppError } from '../utils/AppError'
import { RoleRepository } from '../repositories/role.repository'
import { UserRoleRepository } from '../repositories/userRole.repository'
import { UserRoleWithDetails, ResolvedUserRole } from '../models/interfaces/RoleInterfaces'

export class UserRoleService {
  constructor(
    private knex: Knex,
    private roleRepo: RoleRepository,
    private userRoleRepo: UserRoleRepository
  ) {}

  // --- POST /users/:userId/roles ---
  async assignRole(
    userId: number,
    roleId: number,
    schoolId: number | null,
    academicYearId: number | null,
    assignedBy: number // current logged-in user
  ): Promise<UserRoleWithDetails> {
    // Validate role exists
    const role = await this.roleRepo.findById(roleId)
    if (!role) {
      throw new AppError('VALIDATION_ERROR', 'Role not found')
    }

    // Prevent assigning student or teacher roles via API (reserved for auto-assignment)
    if (role.name === 'student' || role.name === 'teacher') {
      throw new AppError('VALIDATION_ERROR', 'Cannot assign student or teacher roles manually')
    }

    // Check for duplicate active assignment
    const existing = await this.userRoleRepo.findByAssignment(
      userId,
      roleId,
      schoolId,
      academicYearId
    )
    if (existing && existing.is_active) {
      throw new AppError('ALREADY_EXISTS', `User already has active "${role.name}"${schoolId ? ` at school ${schoolId}` : ''}${academicYearId ? ` in year ${academicYearId}` : ''}`)
    }

    // Deactivate conflicting assignments with same scope if needed (optional: allow multiple)
    // For now, we allow duplicate with different scopes but warn about same scope

    const inserted = await this.userRoleRepo.insert({
      user_id: userId,
      role_id: roleId,
      school_id: schoolId,
      academic_year_id: academicYearId,
    })

    // Update granted_by
    await this.knex('user_roles')
      .where({ id: inserted.id })
      .update({ granted_by: assignedBy })

    // Reload with details
    const withDetails = await this.userRoleRepo.findAllForUser(userId)
    const matched = withDetails.find(r => r.id === inserted.id)
    return matched as UserRoleWithDetails
  }

  // --- GET /users/:userId/roles ---
  async listRolesForUser(
    userId: number,
    isActive: boolean | null = null
  ): Promise<UserRoleWithDetails[]> {
    return this.userRoleRepo.findAllForUser(userId, isActive)
  }

  // --- GET /me/roles ---
  async listMyRoles(
    userId: number,
    isActive: boolean | null = null
  ): Promise<UserRoleWithDetails[]> {
    return this.userRoleRepo.findAllForUser(userId, isActive)
  }

  // --- GET /me/context ---
  async getMyContext(userId: number): Promise<Array<{
    user_id: number
    role: string
    role_id: number
    school_id: number | null
    academic_year_id: number | null
  }>> {
    const roles = await this.userRoleRepo.findAllForUser(userId, true)
    return roles.map(r => ({
      user_id: r.user_id,
      role: r.role_name,
      role_id: r.role_id,
      school_id: r.school_id,
      academic_year_id: r.academic_year_id,
    }))
  }

  // --- PATCH /user-roles/:roleAssignmentId ---
  async updateRole(
    roleAssignmentId: number,
    updates: { is_active?: boolean },
    requesterUserId: number,
    schoolId?: number | null
  ): Promise<UserRoleWithDetails> {
    const existing = await this.userRoleRepo.findById(roleAssignmentId)
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Role assignment not found')
    }

    // Cross-school protection
    if (schoolId && existing.school_id !== schoolId) {
      throw new AppError('FORBIDDEN', 'You do not have permission to update this role assignment')
    }

    // Authorization: only the user themselves or an admin can update
    if (existing.user_id !== requesterUserId) {
      throw new AppError('FORBIDDEN', 'Cannot update another user\'s role assignment')
    }

    if (updates.is_active !== undefined) {
      await this.userRoleRepo.deactivate(roleAssignmentId)
      // Re-insert as active if turning on (since deactivate sets is_active=false)
      if (updates.is_active) {
        await this.knex('user_roles')
          .where({ id: roleAssignmentId })
          .update({ is_active: true, updated_at: new Date() })
      }
    }

    return (await this.userRoleRepo.findAllForUser(existing.user_id)).find(r => r.id === roleAssignmentId) as UserRoleWithDetails
  }

  // --- DELETE /user-roles/:roleAssignmentId ---
  async deleteRole(
    roleAssignmentId: number,
    requesterUserId: number,
    schoolId?: number | null
  ): Promise<void> {
    const existing = await this.userRoleRepo.findById(roleAssignmentId)
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Role assignment not found')
    }

    // Cross-school protection
    if (schoolId && existing.school_id !== schoolId) {
      throw new AppError('FORBIDDEN', 'You do not have permission to delete this role assignment')
    }

    if (existing.user_id !== requesterUserId) {
      throw new AppError('FORBIDDEN', 'Cannot delete another user\'s role assignment')
    }

    await this.userRoleRepo.delete(roleAssignmentId)
  }

  // --- Admin: deactivate any role assignment ---
  async deactivateRole(
    roleAssignmentId: number,
    requesterUserId: number
  ): Promise<void> {
    const existing = await this.userRoleRepo.findById(roleAssignmentId)
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Role assignment not found')
    }

    // Check authorization
    const requesterRoles = await this.resolveAndCheckAdminAccess(
      requesterUserId,
      existing.school_id
    )
    const isAdmin = requesterRoles.some(r => ['super_admin', 'admin'].includes(r.role))

    if (!isAdmin && existing.user_id !== requesterUserId) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to deactivate this role assignment')
    }

    await this.userRoleRepo.deactivate(roleAssignmentId)
  }

  // --- Private helpers ---

  private async resolveAndCheckAdminAccess(
    userId: number,
    schoolId: number | null
  ): Promise<ResolvedUserRole[]> {
    // Resolve all active roles for requester (no specific school/year context)
    return this.userRoleRepo.findAllForUser(userId, true)
      .then(rows => rows.map(r => ({
        role: r.role_name,
        school_id: r.school_id,
        academic_year_id: r.academic_year_id,
        is_active: true,
      })))
  }
}
