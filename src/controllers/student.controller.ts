// =====================================================
// Student Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { StudentService } from '../services/student.service'
import { StudentRepository } from '../repositories/student.repository'
import { AppError } from '../utils/AppError'
import {
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilterInput,
} from '../validators/student.validator'

export class StudentController {
  private service: StudentService
  private repo: StudentRepository

  constructor(knex: Knex) {
    this.repo = new StudentRepository(knex)
    this.service = new StudentService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as StudentFilterInput
    // Phase 1: enforce school isolation via activeSchoolId (overrides query param)
    const filter = { ...query, school_id: req.activeSchoolId ?? undefined } as StudentFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    if (req.activeSchoolId) {
      const entity = await this.repo.findById(id)
      if (!entity) throw new AppError('NOT_FOUND', 'Student not found')
      if (entity.school_id !== req.activeSchoolId) {
        throw new AppError('NOT_FOUND', 'Student not found')
      }
      return reply.send(entity)
    }

    return reply.send(await this.service.getById(id))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateStudentInput
    // Phase 1: auto-fill school_id from active context if not provided
    const payload = { ...body, school_id: body.school_id ?? req.activeSchoolId } as CreateStudentInput
    return reply.status(201).send(await this.service.create(payload))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateStudentInput

    // Cross-school protection: if school context is active, verify ownership
    if (req.activeSchoolId) {
      const student = await this.repo.findById(id)
      if (!student) throw new AppError('NOT_FOUND', 'Student not found')
      if (student.school_id !== req.activeSchoolId) {
        throw new AppError('NOT_FOUND', 'Student not found')
      }
    }

    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    // Cross-school protection: if school context is active, verify ownership
    if (req.activeSchoolId) {
      const student = await this.repo.findById(id)
      if (!student) throw new AppError('NOT_FOUND', 'Student not found')
      if (student.school_id !== req.activeSchoolId) {
        throw new AppError('NOT_FOUND', 'Student not found')
      }
    }

    await this.service.delete(id)
    return reply.code(204).send({ message: 'Student deleted' })
  }
}