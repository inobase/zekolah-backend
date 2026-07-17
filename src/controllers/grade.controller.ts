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

  list = async (req: FastifyRequest<{ Reply: unknown }>, reply: FastifyReply) => {
    // Phase 2: enforce school isolation via activeSchoolId
    const filter = { ...(req.query as Record<string, unknown>), school_id: req.activeSchoolId ?? undefined } as GradeFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.getById(req.params.id))
  }

  create = async (req: FastifyRequest<{ Body: CreateGradeInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.create(req.body))
  }

  update = async (req: FastifyRequest<{ Params: { id: number }; Body: UpdateGradeInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Grade deleted' })
  }
}
