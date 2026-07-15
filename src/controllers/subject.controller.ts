// =====================================================
// Subject Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { SubjectService } from '../services/subject.service'
import { CreateSubjectInput, UpdateSubjectInput, SubjectFilterInput } from '../validators/subject.validator'

export class SubjectController {
  private service: SubjectService

  constructor(private knex: Knex) {
    this.service = new SubjectService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as SubjectFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateSubjectInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateSubjectInput
    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'Subject deleted' })
  }
}