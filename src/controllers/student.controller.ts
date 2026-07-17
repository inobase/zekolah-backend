// =====================================================
// Student Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { StudentService } from '../services/student.service'
import {
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilterInput,
} from '../validators/student.validator'

export class StudentController {
  private service: StudentService

  constructor(private knex: Knex) {
    this.service = new StudentService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as StudentFilterInput
    // Phase 1: enforce school isolation via activeSchoolId (overrides query param)
    const filter = { ...query, school_id: req.activeSchoolId }
    return reply.send(await this.service.list(filter))
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
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
    return reply.send(await this.service.update(id, body))
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'Student deleted' })
  }
}