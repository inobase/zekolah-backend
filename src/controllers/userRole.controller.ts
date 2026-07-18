// =====================================================
// Role Assignment Controller
// =====================================================

import { FastifyRequest, FastifyReply } from 'fastify'
import { UserRoleService } from '../services/userRole.service'
import { AssignUserRoleBody, UpdateRoleInput } from '../validators/role-assignment.validator'

export class UserRoleController {
  constructor(private service: UserRoleService) {}

  // POST /users/:userId/roles
  assign = async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = Number((req.params as { id: string }).id)
    const body = AssignUserRoleBody.parse(req.body)

    const roleAssignment = await this.service.assignRole(
      userId,
      body.role_id,
      body.school_id ?? req.activeSchoolId ?? null,
      body.academic_year_id ?? null,
      req.user.id
    )

    return reply.code(201).send({
      message: 'Role assigned successfully',
      data: roleAssignment,
    })
  }

  // GET /users/:userId/roles
  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = Number((req.params as { id: string }).id)
    const filter = req.query as Record<string, unknown>

    let isActive: boolean | null = null
    if (filter.is_active !== undefined) {
      isActive = filter.is_active === 'true' || filter.is_active === true
    }

    const roles = await this.service.listRolesForUser(userId, isActive)

    return reply.send({
      data: roles,
    })
  }

  // GET /me/roles
  listMyRoles = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as Record<string, unknown>

    let isActive: boolean | null = null
    if (filter.is_active !== undefined) {
      isActive = filter.is_active === 'true' || filter.is_active === true
    }

    const roles = await this.service.listMyRoles(req.user.id, isActive)

    return reply.send({
      data: roles,
    })
  }

  // GET /me/context
  myContext = async (req: FastifyRequest, reply: FastifyReply) => {
    const contexts = await this.service.getMyContext(req.user.id)

    return reply.send({
      data: contexts,
    })
  }

  // PATCH /user-roles/:roleId
  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const roleAssignmentId = Number((req.params as { roleId: string }).roleId)
    const body = UpdateRoleInput.parse(req.body)

    const role = await this.service.updateRole(roleAssignmentId, body, req.user.id, req.activeSchoolId)

    return reply.send({
      message: 'Role assignment updated',
      data: role,
    })
  }

  // DELETE /user-roles/:roleId
  remove = async (req: FastifyRequest, reply: FastifyReply) => {
    const roleAssignmentId = Number((req.params as { roleId: string }).roleId)

    await this.service.deleteRole(roleAssignmentId, req.user.id, req.activeSchoolId)

    return reply.code(204).send()
  }
}
