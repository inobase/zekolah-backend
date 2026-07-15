// =====================================================
// Teacher Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { TeacherService } from '../services/teacher.service'
import {
  CreateTeacherInput,
  UpdateTeacherInput,
  TeacherFilterInput,
} from '../validators/teacher.validator'

export class TeacherController {
  private service: TeacherService

  constructor(private knex: Knex) {
    this.service = new TeacherService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as TeacherFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateTeacherInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateTeacherInput
    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'Teacher deleted' })
  }
}