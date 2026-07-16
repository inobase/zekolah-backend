// =====================================================
// Grade Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { GradeService } from '../services/grade.service'
import {
  CreateGradeInput,
  UpdateGradeInput,
  GradeFilterInput,
} from '../validators/grade.validator'

export class GradeController {
  private service: GradeService

  constructor(private knex: Knex) {
    this.service = new GradeService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as GradeFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(Number(id)))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateGradeInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateGradeInput
    return reply.send(await this.service.update(Number(id), body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(Number(id))
    return reply.code(204).send({ message: 'Grade deleted' })
  }
}
