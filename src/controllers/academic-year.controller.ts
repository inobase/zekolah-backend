// =====================================================
// Academic Year Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { AcademicYearService } from '../services/academic-year.service'
import {
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
  AcademicYearFilterInput,
} from '../validators/academic-year.validator'

export class AcademicYearController {
  private service: AcademicYearService

  constructor(private knex: Knex) {
    this.service = new AcademicYearService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as AcademicYearFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateAcademicYearInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateAcademicYearInput
    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'Academic year deleted' })
  }
}