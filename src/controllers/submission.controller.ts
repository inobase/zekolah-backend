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

  list = async (req: FastifyRequest<{ Reply: unknown }>, reply: FastifyReply) => {
    // Phase 1: pass activeSchoolId into filter (Phase 2 will add repo support for school_id)
    const query = req.query as SubmissionFilterInput
    const filter = { ...query, school_id: req.activeSchoolId } as SubmissionFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.getById(req.params.id))
  }

  create = async (req: FastifyRequest<{ Body: CreateSubmissionInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.create(req.body))
  }

  update = async (req: FastifyRequest<{ Params: { id: number }; Body: UpdateSubmissionInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Submission deleted' })
  }
}
