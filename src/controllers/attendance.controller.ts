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

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as AttendanceFilterInput
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    return reply.send(await this.service.getById(Number(id)))
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateAttendanceInput
    return reply.status(201).send(await this.service.create(body))
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateAttendanceInput
    return reply.send(await this.service.update(Number(id), body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(Number(id))
    return reply.code(204).send({ message: 'Attendance record deleted' })
  }
}
