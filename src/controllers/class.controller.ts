// =====================================================
// Class Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { ClassService } from '../services/class.service'
import {
  CreateClassInput,
  UpdateClassInput,
  ClassFilterInput,
} from '../validators/class.validator'

export class ClassController {
  private service: ClassService

  constructor(private knex: Knex) {
    this.service = new ClassService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as ClassFilterInput
    // Phase 1: enforce school isolation via activeSchoolId
    const filter = { ...query, school_id: req.activeSchoolId ?? query.school_id }
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateClassInput
    // Phase 1: auto-fill school_id from active context if not provided
    const payload = { ...body, school_id: body.school_id ?? req.activeSchoolId } as CreateClassInput
    return reply.status(201).send(await this.service.create(payload))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateClassInput
    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'Class deleted' })
  }
}