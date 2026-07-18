// =====================================================
// TeachingAssignment Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { TeachingAssignmentService } from '../services/teaching-assignment.service'
import { TeachingAssignmentRepository } from '../repositories/teaching-assignment.repository'
import { AppError } from '../utils/AppError'
import {
  CreateTeachingAssignmentInput,
  UpdateTeachingAssignmentInput,
  TeachingAssignmentFilterInput,
} from '../validators/teaching-assignment.validator'

export class TeachingAssignmentController {
  private service: TeachingAssignmentService
  private repo: TeachingAssignmentRepository

  constructor(knex: Knex) {
    this.repo = new TeachingAssignmentRepository(knex)
    this.service = new TeachingAssignmentService(knex)
  }

  list = async (req: FastifyRequest<{ Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.list(req.query as TeachingAssignmentFilterInput))
  }

  getById = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.getById(req.params.id))
  }

  create = async (req: FastifyRequest<{ Body: CreateTeachingAssignmentInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.create(req.body))
  }

  update = async (req: FastifyRequest<{ Params: { id: number }; Body: UpdateTeachingAssignmentInput; Reply: unknown }>, reply: FastifyReply) => {
    if (req.activeSchoolId) {
      const entity = await this.repo.findById(req.params.id)
      if (!entity) throw new AppError('NOT_FOUND', 'Teaching assignment not found')
      if ((entity as any).class_school_id !== req.activeSchoolId) {
        throw new AppError('FORBIDDEN', 'You do not have permission to update this teaching assignment')
      }
    }
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(req.params.id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Teaching assignment not found')
    }
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Teaching assignment deleted' })
  }
}
