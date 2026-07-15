// =====================================================
// School Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { SchoolService } from '../services/school.service'
import {
  CreateSchoolInput,
  UpdateSchoolInput,
  SchoolFilterInput,
} from '../validators/school.validator'

export class SchoolController {
  private service: SchoolService

  constructor(private knex: Knex) {
    this.service = new SchoolService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as SchoolFilterInput
    const result = await this.service.list(filter)
    return reply.send(result)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const school = await this.service.getById(id)
    return reply.send(school)
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateSchoolInput
    const school = await this.service.create(body)
    return reply.status(201).send(school)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateSchoolInput
    const school = await this.service.update(id, body)
    return reply.send(school)
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'School deleted' })
  }
}