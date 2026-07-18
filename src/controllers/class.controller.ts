// =====================================================
// Class Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { ClassService } from '../services/class.service'
import { ClassRepository } from '../repositories/class.repository'
import { AppError } from '../utils/AppError'
import {
  CreateClassInput,
  UpdateClassInput,
  ClassFilterInput,
} from '../validators/class.validator'

export class ClassController {
  private service: ClassService
  private repo: ClassRepository

  constructor(knex: Knex) {
    this.repo = new ClassRepository(knex)
    this.service = new ClassService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as ClassFilterInput
    // Phase 1: enforce school isolation via activeSchoolId
    const filter = { ...query, school_id: req.activeSchoolId ?? undefined } as ClassFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    if (req.activeSchoolId) {
      const entity = await this.repo.findById(id)
      if (!entity) throw new AppError('NOT_FOUND', 'Class not found')
      if (entity.school_id !== req.activeSchoolId) {
        throw new AppError('NOT_FOUND', 'Class not found')
      }
      return reply.send(entity)
    }

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

    // Cross-school protection
    if (req.activeSchoolId) {
      const entity = await this.repo.findById(id)
      if (!entity) throw new AppError('NOT_FOUND', 'Class not found')
      if (entity.school_id !== req.activeSchoolId) {
        throw new AppError('FORBIDDEN', 'You do not have permission to update this class')
      }
    }

    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    // Cross-school protection
    if (req.activeSchoolId) {
      const entity = await this.repo.findById(id)
      if (!entity) throw new AppError('NOT_FOUND', 'Class not found')
      if (entity.school_id !== req.activeSchoolId) {
        throw new AppError('FORBIDDEN', 'You do not have permission to delete this class')
      }
    }

    await this.service.delete(id)
    return reply.code(204).send({ message: 'Class deleted' })
  }
}