// =====================================================
// Assignment Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { AssignmentService } from '../services/assignment.service'
import { AssignmentRepository } from '../repositories/assignment.repository'
import { AppError } from '../utils/AppError'
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  AssignmentFilterInput,
} from '../validators/assignment.validator'

export class AssignmentController {
  private service: AssignmentService
  private repo: AssignmentRepository

  constructor(knex: Knex) {
    this.repo = new AssignmentRepository(knex)
    this.service = new AssignmentService(knex)
  }

  list = async (req: FastifyRequest<{ Reply: unknown }>, reply: FastifyReply) => {
    // Phase 2: enforce school isolation via activeSchoolId
    const filter = { ...(req.query as Record<string, unknown>), school_id: req.activeSchoolId ?? undefined } as AssignmentFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    const { id } = req.params

    if (req.activeSchoolId) {
      const entity = await this.repo.findByIdScoped(id, req.activeSchoolId)
      if (!entity) throw new AppError('NOT_FOUND', 'Assignment not found')
      return reply.send(entity)
    }

    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest<{ Body: CreateAssignmentInput; Reply: unknown }>, reply: FastifyReply) => {
    const body = req.body as CreateAssignmentInput
    // Phase 1: auto-fill school_id from active context if not provided
    const payload = { ...body, school_id: body.school_id ?? req.activeSchoolId } as CreateAssignmentInput
    return reply.status(201).send(await this.service.create(payload))
  }

  update = async (req: FastifyRequest<{ Params: { id: number }; Body: UpdateAssignmentInput; Reply: unknown }>, reply: FastifyReply) => {
    // Cross-school protection
    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(req.params.id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Assignment not found')
    }
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    // Cross-school protection
    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(req.params.id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Assignment not found')
    }
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Assignment deleted' })
  }
}