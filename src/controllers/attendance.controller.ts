// =====================================================
// Attendance Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { AttendanceService } from '../services/attendance.service'
import { AttendanceRepository } from '../repositories/attendance.repository'
import { AppError } from '../utils/AppError'
import {
  CreateAttendanceInput,
  UpdateAttendanceInput,
  AttendanceFilterInput,
} from '../validators/attendance.validator'

export class AttendanceController {
  private service: AttendanceService
  private repo: AttendanceRepository

  constructor(knex: Knex) {
    this.repo = new AttendanceRepository(knex)
    this.service = new AttendanceService(knex)
  }

  list = async (req: FastifyRequest<{ Reply: unknown }>, reply: FastifyReply) => {
    // Phase 2: enforce school isolation via activeSchoolId
    const filter = { ...(req.query as Record<string, unknown>), school_id: req.activeSchoolId ?? undefined } as AttendanceFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(req.params.id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Attendance not found')
      return reply.send(scoped)
    }
    return reply.send(await this.service.getById(req.params.id))
  }

  create = async (req: FastifyRequest<{ Body: CreateAttendanceInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.create(req.body))
  }

  update = async (req: FastifyRequest<{ Params: { id: number }; Body: UpdateAttendanceInput; Reply: unknown }>, reply: FastifyReply) => {
    // Cross-school protection
    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(req.params.id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Attendance not found')
    }
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    // Cross-school protection
    if (req.activeSchoolId) {
      const scoped = await this.repo.findByIdScoped(req.params.id, req.activeSchoolId)
      if (!scoped) throw new AppError('NOT_FOUND', 'Attendance not found')
    }
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Attendance record deleted' })
  }
}
