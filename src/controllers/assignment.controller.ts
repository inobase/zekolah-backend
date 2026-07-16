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

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as AssignmentFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(Number(id)))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateAssignmentInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateAssignmentInput
    return reply.send(await this.service.update(Number(id), body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(Number(id))
    return reply.code(204).send({ message: 'Assignment deleted' })
  }
}