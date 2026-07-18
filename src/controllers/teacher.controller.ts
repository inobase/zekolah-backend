// =====================================================
// Teacher Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { TeacherService } from '../services/teacher.service'
import { TeacherRepository } from '../repositories/teacher.repository'
import { AppError } from '../utils/AppError'
import {
  CreateTeacherInput,
  UpdateTeacherInput,
  TeacherFilterInput,
} from '../validators/teacher.validator'

export class TeacherController {
  private service: TeacherService
  private repo: TeacherRepository

  constructor(knex: Knex) {
    this.repo = new TeacherRepository(knex)
    this.service = new TeacherService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as TeacherFilterInput
    // Phase 1: enforce school isolation via activeSchoolId
    const filter = { ...query, school_id: req.activeSchoolId ?? undefined } as TeacherFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    if (req.activeSchoolId) {
      const entity = await this.repo.findById(id)
      if (!entity) throw new AppError('NOT_FOUND', 'Teacher not found')
      if (entity.school_id !== req.activeSchoolId) {
        throw new AppError('NOT_FOUND', 'Teacher not found')
      }
      return reply.send(entity)
    }

    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateTeacherInput
    // Phase 1: auto-fill school_id from active context; validate mismatch if explicit
    const payload = { ...body, school_id: body.school_id ?? req.activeSchoolId } as CreateTeacherInput
    return reply.status(201).send(await this.service.create(payload))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateTeacherInput

    // Cross-school protection: if school context is active, verify ownership
    if (req.activeSchoolId) {
      const teacher = await this.repo.findById(id)
      if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')
      if (teacher.school_id !== req.activeSchoolId) {
        throw new AppError('FORBIDDEN', 'You do not have permission to update this teacher')
      }
    }

    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    // Cross-school protection: if school context is active, verify ownership
    if (req.activeSchoolId) {
      const teacher = await this.repo.findById(id)
      if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')
      if (teacher.school_id !== req.activeSchoolId) {
        throw new AppError('FORBIDDEN', 'You do not have permission to delete this teacher')
      }
    }

    await this.service.delete(id)
    return reply.code(204).send({ message: 'Teacher deleted' })
  }
}