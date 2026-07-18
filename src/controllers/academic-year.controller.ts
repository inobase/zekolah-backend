// =====================================================
// Academic Year Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { AcademicYearService } from '../services/academic-year.service'
import { AcademicYearRepository } from '../repositories/academic-year.repository'
import { AppError } from '../utils/AppError'
import {
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
  AcademicYearFilterInput,
} from '../validators/academic-year.validator'

export class AcademicYearController {
  private service: AcademicYearService
  private repo: AcademicYearRepository

  constructor(knex: Knex) {
    this.repo = new AcademicYearRepository(knex)
    this.service = new AcademicYearService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as AcademicYearFilterInput
    // Phase 1: preserve query.school_id, fallback to activeSchoolId context
    const filter = {
      ...query,
      school_id: query.school_id ?? (req.activeSchoolId ?? undefined),
    } as AcademicYearFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Academic year not found')
      return reply.send(scoped)
    }

    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateAcademicYearInput
    // Phase 1: auto-fill school_id from active context if not provided
    const payload = { ...body, school_id: body.school_id ?? req.activeSchoolId } as CreateAcademicYearInput
    return reply.status(201).send(await this.service.create(payload))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateAcademicYearInput

    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Academic year not found')
    }

    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Academic year not found')
    }

    await this.service.delete(id)
    return reply.code(204).send({ message: 'Academic year deleted' })
  }
}