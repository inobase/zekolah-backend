// =====================================================
// requireRole Middleware Factory
// Use to guard routes — accepts single role, array, or predicate.
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { ResolvedUserRole } from '../models/interfaces/RoleInterfaces'

export type RoleRequirement =
  | string                                  // single role name
  | string[]                                // any-of (OR)
  | ((roles: ResolvedUserRole[]) => boolean) // custom predicate

/**
 * Factory: returns a Fastify preHandler that rejects the request
 * unless the user's resolved roles match the requirement.
 *
 * Usage:
 *   fastify.get('/admin/x', { preHandler: requireRole('admin') }, handler)
 *   fastify.get('/staff/x', { preHandler: requireRole(['admin', 'staff', 'super_admin']) }, handler)
 */
export const requireRole = (requirement: RoleRequirement) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // After authenticate, req.user is populated
    const user = request.user as any

    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Get roles from augmented user (set by app.authenticate in Phase 3)
    const roles: ResolvedUserRole[] = user.roles ?? []

    if (roles.length === 0) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'No role assigned',
      })
    }

    // Evaluate requirement
    let allowed = false
    if (typeof requirement === 'function') {
      allowed = requirement(roles)
    } else if (typeof requirement === 'string') {
      const lower = requirement.toLowerCase()
      allowed = roles.some(r => r.role.toLowerCase() === lower)
    } else {
      // array — ANY of these roles
      const lowered = new Set(requirement.map(r => r.toLowerCase()))
      allowed = roles.some(r => lowered.has(r.role.toLowerCase()))
    }

    if (!allowed) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Required role: ${typeof requirement === 'string' ? requirement : 'one of ' + (requirement as string[]).join(', ')}`,
      })
    }
  }
}