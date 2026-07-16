// =====================================================
// TeachingAssignment Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { TeachingAssignmentService } from '../services/teaching-assignment.service'
import {
  CreateTeachingAssignmentInput,
  UpdateTeachingAssignmentInput,
  TeachingAssignmentFilterInput,
} from '../validators/teaching-assignment.validator'

export class TeachingAssignmentController {
  private service: TeachingAssignmentService

  constructor(private knex: Knex) {
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
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Teaching assignment deleted' })
  }
}
