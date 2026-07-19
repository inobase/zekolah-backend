// =====================================================
// School Program Controller
// Handles activation/deactivation of programs & specializations per school
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { SchoolProgramService } from '../services/schoolProgram.service'
import { AppError } from '../utils/AppError'

export class SchoolProgramController {
  private service: SchoolProgramService

  constructor(private knex: Knex) {
    this.service = new SchoolProgramService(knex)
  }

  // ==================== PROGRAMS ====================

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const schoolId = req.params as { schoolId: number }
    if (req.activeSchoolId && req.activeSchoolId !== schoolId.schoolId) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: 'Cannot access programs from another school' })
    }
    const programs = await this.service.list(schoolId.schoolId)
    // Strip joined `program` object for clean response
    const clean = programs.map((p: any) => ({
      id: p.id,
      school_id: p.school_id,
      program_id: p.program_id,
      is_active: p.is_active,
      activated_at: p.activated_at,
      activated_by: p.activated_by,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))
    return reply.send(clean)
  }

  getAvailable = async (req: FastifyRequest, reply: FastifyReply) => {
    const schoolId = req.params as { schoolId: number }
    if (req.activeSchoolId && req.activeSchoolId !== schoolId.schoolId) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: 'Cannot access programs from another school' })
    }
    const available = await this.service.getAvailable(schoolId.schoolId)
    // Map to clean shape
    const clean = (available as any[]).map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      education_level: p.education_level,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))
    return reply.send(clean)
  }

  activate = async (req: FastifyRequest, reply: FastifyReply) => {
    const schoolId = req.params as { schoolId: number }
    if (req.activeSchoolId && req.activeSchoolId !== schoolId.schoolId) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: 'Cannot activate programs for another school' })
    }
    const programId = req.body as { program_id: number }
    const userId = (req.user as any)?.id
    const result = await this.service.activate(schoolId.schoolId, programId.program_id, userId)
    // Strip joined `program` object
    const clean = {
      id: result.id,
      school_id: result.school_id,
      program_id: result.program_id,
      is_active: result.is_active,
      activated_at: result.activated_at,
      activated_by: result.activated_by,
      created_at: result.created_at,
      updated_at: result.updated_at,
    }
    return reply.status(201).send(clean)
  }

  deactivate = async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.params as { schoolId: number; programId: number }
    if (req.activeSchoolId && req.activeSchoolId !== params.schoolId) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: 'Cannot deactivate programs from another school' })
    }
    await this.service.deactivate(params.programId, params.schoolId)
    return reply.code(204).send({ message: 'School program deactivated' })
  }

  // ==================== SPECIALIZATIONS ====================

  listSpecializations = async (req: FastifyRequest, reply: FastifyReply) => {
    const schoolProgramId = req.params as { schoolProgramId: number }
    const specs = await this.service.listSpecializations(schoolProgramId.schoolProgramId)
    const clean = specs.map((s: any) => ({
      id: s.id,
      school_program_id: s.school_program_id,
      specialization_id: s.specialization_id,
      is_active: s.is_active,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }))
    return reply.send(clean)
  }

  activateSpecialization = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { specialization_id: number }
    const schoolProgramId = req.params as { schoolProgramId: number }
    const ids = await this.knex('school_specializations').insert({
      school_program_id: schoolProgramId.schoolProgramId,
      specialization_id: body.specialization_id,
      is_active: true,
    })
    return reply.status(201).send({
      id: ids[0] as number,
      school_program_id: schoolProgramId.schoolProgramId,
      specialization_id: body.specialization_id,
    })
  }

  deactivateSpecialization = async (req: FastifyRequest, reply: FastifyReply) => {
    const specId = req.params as { specId: number }
    const schoolProgramId = req.params as { schoolProgramId: number }
    await this.knex('school_specializations')
      .where({ specialization_id: specId.specId, school_program_id: schoolProgramId.schoolProgramId })
      .update({ is_active: false })
    return reply.code(204).send({ message: 'School specialization deactivated' })
  }
}
