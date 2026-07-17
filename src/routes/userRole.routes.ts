// =====================================================
// Role Assignment Routes
// =====================================================

import { FastifyRequest, FastifyReply } from 'fastify'
import { FastifyZodInstance } from '../types/fastify-zod'
import { RoleRepository } from '../repositories/role.repository'
import { UserRoleRepository } from '../repositories/userRole.repository'
import { UserRoleService } from '../services/userRole.service'
import { UserRoleController } from '../controllers/userRole.controller'
import { getKnex } from '../config/database'

export const userRoleRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const service = new UserRoleService(
    knex,
    new RoleRepository(knex),
    new UserRoleRepository(knex)
  )
  const controller = new UserRoleController(service)

  // --- Self-service endpoints (any authenticated user) ---

  // GET /me/roles — list roles of the current user
  app.get(
    '/me/roles',
    { preValidation: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return controller.listMyRoles(req, reply)
    }
  )

  // GET /me/context — list all school/year contexts where user has active roles
  app.get(
    '/me/context',
    { preValidation: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return controller.myContext(req, reply)
    }
  )

  // --- Admin-managed role assignment endpoints ---

  // POST /users/:id/roles — assign a role to a user (caller must be authorized)
  app.post(
    '/users/:id/roles',
    { preValidation: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return controller.assign(req, reply)
    }
  )

  // GET /users/:id/roles — list roles assigned to a specific user
  app.get(
    '/users/:id/roles',
    { preValidation: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return controller.list(req, reply)
    }
  )

  // PATCH /user-roles/:roleId — activate/deactivate role assignment
  app.patch(
    '/user-roles/:roleId',
    { preValidation: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return controller.update(req, reply)
    }
  )

  // DELETE /user-roles/:roleId — hard delete role assignment
  app.delete(
    '/user-roles/:roleId',
    { preValidation: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return controller.remove(req, reply)
    }
  )
}
