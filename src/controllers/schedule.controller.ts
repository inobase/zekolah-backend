// =====================================================
// Schedule Controller
// CRUD for schedules with time slots
// SCHOOL_ADMIN scope for writes; TEACHER for reads; STUDENT for timetable reads
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { ScheduleService } from '../services/schedule.service'

export class ScheduleController {
  private service: ScheduleService

  constructor(private knex: Knex) {
    this.service = new ScheduleService(knex)
  }

  // ==================== SCHEDULES ====================

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const { page, limit, class_id, teacher_id, school_subject_id, academic_year_id, semester, status } = req.query as any
    const result = await this.service.list({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      class_id: class_id ? Number(class_id) : undefined,
      teacher_id: teacher_id ? Number(teacher_id) : undefined,
      school_subject_id: school_subject_id ? Number(school_subject_id) : undefined,
      academic_year_id: academic_year_id ? Number(academic_year_id) : undefined,
      semester,
      status,
    })
    return reply.send(result)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const schedule = await this.service.getById(id)
    return reply.send(schedule)
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any
    const schedule = await this.service.create(body)
    return reply.status(201).send(schedule)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as any
    const schedule = await this.service.update(id, body)
    return reply.send(schedule)
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.delete(id)
    return reply.code(204).send({ message: 'Schedule deleted' })
  }

  getByClass = async (req: FastifyRequest, reply: FastifyReply) => {
    const { classId } = req.params as { classId: number }
    const { academic_year_id, semester } = req.query as any
    const schedules = await this.service.findByClass(
      classId,
      Number(academic_year_id),
      semester
    )
    return reply.send({ data: schedules })
  }

  getByTeacher = async (req: FastifyRequest, reply: FastifyReply) => {
    const { teacherId } = req.params as { teacherId: number }
    const { academic_year_id, semester } = req.query as any
    const schedules = await this.service.findByTeacher(
      teacherId,
      Number(academic_year_id),
      semester
    )
    return reply.send({ data: schedules })
  }

  // ==================== TIMETABLE ====================

  getWeeklyTimetable = async (req: FastifyRequest, reply: FastifyReply) => {
    const { classId } = req.params as { classId: number }
    const { academic_year_id, semester } = req.query as any
    const timetable = await this.service.getWeeklyTimetable(
      classId,
      Number(academic_year_id),
      semester || 'ganjil'
    )
    return reply.send(timetable)
  }

  getTeacherWeeklyTimetable = async (req: FastifyRequest, reply: FastifyReply) => {
    const { teacherId } = req.params as { teacherId: number }
    const { academic_year_id, semester } = req.query as any
    const timetable = await this.service.getTeacherWeeklyTimetable(
      teacherId,
      Number(academic_year_id),
      semester || 'ganjil'
    )
    return reply.send(timetable)
  }

  // ==================== CONFLICTS ====================

  detectConflicts = async (req: FastifyRequest, reply: FastifyReply) => {
    const { class_id, teacher_id, academic_year_id, semester } = req.query as any
    const conflicts = await this.service.detectConflicts({
      class_id: class_id ? Number(class_id) : undefined,
      teacher_id: teacher_id ? Number(teacher_id) : undefined,
      academic_year_id: academic_year_id ? Number(academic_year_id) : undefined,
      semester,
    })
    return reply.send({ data: conflicts })
  }
}
