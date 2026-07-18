// =====================================================
// Program Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { ProgramService } from '../services/program.service'
import { AppError } from '../utils/AppError'

export class ProgramController {
  private service: ProgramService

  constructor(private knex: Knex) {
    this.service = new ProgramService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const { page, limit, search, education_level, is_active } = req.query as any
    const result = await this.service.list({ page, limit, search, education_level, is_active })
    return reply.send(result)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const program = await this.service.getById(id)
    return reply.send(program)
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any
    const program = await this.service.create(body)
    return reply.status(201).send(program)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as any
    const program = await this.service.update(id, body)
    return reply.send(program)
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.deactivate(id)
    return reply.code(204).send({ message: 'Program deactivated' })
  }

  // ==================== SPECIALIZATIONS ====================

  listSpecializations = async (req: FastifyRequest, reply: FastifyReply) => {
    const { programId } = req.params as { programId: number }
    const { page, limit, search, is_active } = req.query as any
    const result = await this.service.listSpecializations(programId, { page, limit, search, is_active })
    return reply.send(result)
  }

  getSpecializationById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const spec = await this.service.getSpecializationById(id)
    return reply.send(spec)
  }

  createSpecialization = async (req: FastifyRequest, reply: FastifyReply) => {
    const { programId } = req.params as { programId: number }
    const body = req.body as any
    const spec = await this.service.createSpecialization({ ...body, program_id: programId })
    return reply.status(201).send(spec)
  }

  updateSpecialization = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as any
    const spec = await this.service.updateSpecialization(id, body)
    return reply.send(spec)
  }

  deleteSpecialization = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.deactivateSpecialization(id)
    return reply.code(204).send({ message: 'Specialization deactivated' })
  }
}
