// =====================================================
// School Subject Controller
// CRUD for school-level subjects
// SCHOOL_ADMIN scope (scoped via :schoolId route param)
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { SchoolSubjectService } from '../services/schoolSubject.service'

export class SchoolSubjectController {
  private service: SchoolSubjectService

  constructor(private knex: Knex) {
    this.service = new SchoolSubjectService(knex)
  }

  // ==================== SUBJECTS ====================

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const { schoolId } = req.params as { schoolId: number }
    const {
      page = 1,
      limit = 50,
      specialization_id,
      subject_type,
      search,
    } = req.query as any
    const result = await this.service.list({
      page: Number(page),
      limit: Number(limit),
      school_id: schoolId,
      specialization_id: specialization_id ? Number(specialization_id) : undefined,
      subject_type,
      search,
    })
    return reply.send(result)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }
    const subject = await this.service.getById(Number(id))
    return reply.send(subject)
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const { schoolId } = req.params as { schoolId: number }
    const body = req.body as any
    const subject = await this.service.create({ ...body, school_id: schoolId })
    return reply.status(201).send(subject)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }
    const body = req.body as any
    const subject = await this.service.update(Number(id), body)
    return reply.send(subject)
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { schoolId } = req.params as { schoolId: number }
    const { id } = req.params as { id: string }
    await this.service.delete(Number(id), schoolId)
    return reply.code(204).send({ message: 'School subject deleted' })
  }

  // List subjects for a specific school specialization
  listBySpecialization = async (req: FastifyRequest, reply: FastifyReply) => {
    const { schoolId, specId } = req.params as { schoolId: number; specId: number }
    const subjects = await this.service.findBySpecialization(schoolId, specId)
    return reply.send({ data: subjects })
  }
}
