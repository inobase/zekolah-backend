// =====================================================
// Attendance Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { AttendanceService } from '../services/attendance.service'
import {
  CreateAttendanceInput,
  UpdateAttendanceInput,
  AttendanceFilterInput,
} from '../validators/attendance.validator'

export class AttendanceController {
  private service: AttendanceService

  constructor(private knex: Knex) {
    this.service = new AttendanceService(knex)
  }

  list = async (req: FastifyRequest<{ Reply: unknown }>, reply: FastifyReply) => {
    // Phase 1: pass activeSchoolId into filter (Phase 2 will add repo support for school_id)
    const query = req.query as AttendanceFilterInput
    const filter = { ...query, school_id: req.activeSchoolId } as AttendanceFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.getById(req.params.id))
  }

  create = async (req: FastifyRequest<{ Body: CreateAttendanceInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.status(201).send(await this.service.create(req.body))
  }

  update = async (req: FastifyRequest<{ Params: { id: number }; Body: UpdateAttendanceInput; Reply: unknown }>, reply: FastifyReply) => {
    return reply.send(await this.service.update(req.params.id, req.body))
  }

  delete = async (req: FastifyRequest<{ Params: { id: number }; Reply: unknown }>, reply: FastifyReply) => {
    await this.service.delete(req.params.id)
    return reply.code(204).send({ message: 'Attendance record deleted' })
  }
}
