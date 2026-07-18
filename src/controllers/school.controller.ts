// =====================================================
// School Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { SchoolService } from '../services/school.service'
import { UserRoleRepository } from '../repositories/userRole.repository'
import {
  CreateSchoolInput,
  UpdateSchoolInput,
  SchoolFilterInput,
} from '../validators/school.validator'
import { AppError } from '../utils/AppError'

export class SchoolController {
  private service: SchoolService

  constructor(private knex: Knex) {
    this.service = new SchoolService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as SchoolFilterInput
    const roleRepo = new UserRoleRepository(this.knex)

    // Admin / super_admin → no restriction
    // No roles at all → no restriction (backward compatible, e.g. new users)
    // Has roles but not admin → filter to schools they belong to
    const roleAssignments = await roleRepo.findAllForUser(req.user.id, true)
    const hasAnyRole = roleAssignments.length > 0
    const isAdminOrSuper = hasAnyRole && roleAssignments.some(
      (r) => r.role_name === 'super_admin' || r.role_name === 'admin'
    )

    let allowedSchoolIds: number[] | null | undefined
    if (hasAnyRole && !isAdminOrSuper) {
      // Collect distinct school_ids from role assignments (NULL = cross-school, skip)
      const schoolIds = roleAssignments
        .filter((r) => r.school_id !== null)
        .map((r) => r.school_id as number)
      // Deduplicate
      allowedSchoolIds = [...new Set(schoolIds)]
      // Empty → user has roles but none scoped to any school; return empty
    }
    // undefined (no role / admin) → return all schools

    const result = await this.service.list(filter, allowedSchoolIds)
    return reply.send(result)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const school = await this.service.getById(id)
    return reply.send(school)
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateSchoolInput
    const school = await this.service.create(body)
    return reply.status(201).send(school)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateSchoolInput
    const school = await this.service.update(id, body)
    return reply.send(school)
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'School deleted' })
  }
}