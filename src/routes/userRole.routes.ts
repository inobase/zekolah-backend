// =====================================================
// Role Assignment Routes — Standard OpenAPI/Swagger schemas
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { UserRoleController } from '../controllers/userRole.controller'
import { UserRoleService } from '../services/userRole.service'
import { RoleRepository } from '../repositories/role.repository'
import { UserRoleRepository } from '../repositories/userRole.repository'
import {
  AssignUserRoleBody,
  UpdateRoleInput,
  RoleAssignmentFilter,
  UserIdParamSchema,
  RoleIdParamSchema,
  RoleAssignmentResponseSchema,
  RoleAssignmentListResponseSchema,
  ContextListResponseSchema,
  DeleteResponseSchema,
} from '../validators/role-assignment.validator'
import { ContextHeadersSchema } from '../validators/common.validator'

function bindHandler(handler: any) {
  return handler
}

export const userRoleRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const service = new UserRoleService(
    knex,
    new RoleRepository(knex),
    new UserRoleRepository(knex)
  )
  const controller = new UserRoleController(service)

  app.withTypeProvider<ZodTypeProvider>()

  // ─── Self-service endpoints (any authenticated user) ───

  // GET /me/roles
  app.get(
    '/me/roles',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['roles'],
        summary: 'List current user role assignments',
        description:
          'Returns all role assignments for the authenticated user.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: RoleAssignmentFilter,
        response: {
          200: RoleAssignmentListResponseSchema,
        },
      },
    },
    bindHandler(controller.listMyRoles.bind(controller))
  )

  // GET /me/context
  app.get(
    '/me/context',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['roles'],
        summary: 'List user accessible school/year contexts',
        description:
          'Returns all school+year contexts where the authenticated user has an active role.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        response: {
          200: ContextListResponseSchema,
        },
      },
    },
    bindHandler(controller.myContext.bind(controller))
  )

  // ─── Admin-managed role assignment endpoints ───

  // POST /users/:id/roles
  app.post(
    '/users/:id/roles',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['roles'],
        summary: 'Assign a role to a user',
        description:
          'Creates a new role assignment for the specified user. The caller must have admin or super_admin privileges.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: UserIdParamSchema,
        body: AssignUserRoleBody,
        response: {
          201: RoleAssignmentResponseSchema,
        },
      },
    },
    bindHandler(controller.assign.bind(controller))
  )

  // GET /users/:id/roles
  app.get(
    '/users/:id/roles',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['roles'],
        summary: 'List role assignments for a user',
        description:
          'Returns all role assignments for the specified user.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: UserIdParamSchema,
        querystring: RoleAssignmentFilter,
        response: {
          200: RoleAssignmentListResponseSchema,
        },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  // PATCH /user-roles/:roleId
  app.patch(
    '/:roleId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['roles'],
        summary: 'Update a role assignment',
        description:
          'Modifies the specified role assignment (e.g., activate/deactivate). The caller must own the assignment or be an admin.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: RoleIdParamSchema,
        body: UpdateRoleInput,
        response: {
          200: RoleAssignmentResponseSchema,
        },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  // DELETE /user-roles/:roleId
  app.delete(
    '/:roleId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['roles'],
        summary: 'Delete a role assignment',
        description:
          'Permanently removes a role assignment. The caller must own the assignment or be an admin.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: RoleIdParamSchema,
        response: {
          204: DeleteResponseSchema,
        },
      },
    },
    bindHandler(controller.remove.bind(controller))
  )
}
