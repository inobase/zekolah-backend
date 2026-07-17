// =====================================================
// Assignment Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { AssignmentService } from '../services/assignment.service'
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  AssignmentFilterInput,
} from '../validators/assignment.validator'

export class AssignmentController {
  private service: AssignmentService

  constructor(private knex: Knex) {
    this.service = new AssignmentService(knex)
  }

  list = async (req: FastifyRequest<{ Reply: unknown }>, reply: FastifyReply) => {
    // Phase 2: enforce school isolation via activeSchoolId
    const filter = { ...(req.query as Record<string, unknown>), school_id: req.activeSchoolId ?? undefined } as AssignmentFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.getById(req.params.id))
  }

  create = async (req: FastifyRequest<{ Body: CreateAssignmentInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.create(req.body))
  }

  update = async (req: FastifyRequest<{ Params: { id: number }; Body: UpdateAssignmentInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Assignment deleted' })
  }
}