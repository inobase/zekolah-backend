// =====================================================
// Submission Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { SubmissionService } from '../services/submission.service'
import {
  CreateSubmissionInput,
  UpdateSubmissionInput,
  SubmissionFilterInput,
} from '../validators/submission.validator'

export class SubmissionController {
  private service: SubmissionService

  constructor(private knex: Knex) {
    this.service = new SubmissionService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as SubmissionFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(Number(id)))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateSubmissionInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateSubmissionInput
    return reply.send(await this.service.update(Number(id), body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(Number(id))
    return reply.code(204).send({ message: 'Submission deleted' })
  }
}
