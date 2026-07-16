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

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as TeachingAssignmentFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(Number(id)))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateTeachingAssignmentInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateTeachingAssignmentInput
    return reply.send(await this.service.update(Number(id), body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(Number(id))
    return reply.code(204).send({ message: 'Teaching assignment deleted' })
  }
}
