// =====================================================
// Schedule Routes — Schedules CRUD + Timetables
// SCHOOL_ADMIN: full CRUD, STUDENT: timetable read, TEACHER: read
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { ScheduleController } from '../controllers/schedule.controller'
import { ContextHeadersSchema } from '../validators/common.validator'
import { z } from 'zod'
import {
  ScheduleIdParamSchema,
  ScheduleClassPathParamSchema,
  ScheduleTeacherPathParamSchema,
  ScheduleFilterSchema,
} from '../validators/schedule.validator'

function bindHandler(handler: any) {
  return handler
}

export const scheduleRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new ScheduleController(knex)

  // ==================== SCHEDULES ====================

  // GET /schedules
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'List all schedules',
        description: 'Returns paginated list of schedules with optional filters.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: ScheduleFilterSchema,
        response: {
          200: z.object({
            data: z.array(z.object({
              id: z.number(),
              class_id: z.number(),
              school_subject_id: z.number(),
              teacher_id: z.number(),
              academic_year_id: z.number(),
              semester: z.enum(['ganjil', 'genap']),
              status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
              room: z.string().nullable(),
              created_at: z.string().or(z.date()),
              updated_at: z.string().or(z.date()),
            })),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  // GET /schedules/:id
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Get schedule by ID',
        description: 'Returns full schedule details with joined class, subject, teacher, academic year.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ScheduleIdParamSchema,
        response: {
          200: z.object({
            id: z.number(),
            class_id: z.number(),
            school_subject_id: z.number(),
            teacher_id: z.number(),
            academic_year_id: z.number(),
            semester: z.enum(['ganjil', 'genap']),
            status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
            room: z.string().nullable(),
            class_name: z.string(),
            class_grade: z.string(),
            school_subject_name: z.string(),
            school_subject_code: z.string(),
            teacher_name: z.string().optional(),
            teacher_phone: z.string().nullable().optional(),
            teacher_specialization: z.string().nullable().optional(),
            academic_year_year: z.string(),
            academic_year_semester: z.string(),
            academic_year_start_date: z.union([z.string(), z.date()]),
            academic_year_end_date: z.union([z.string(), z.date()]),
            school_name: z.string(),
            created_at: z.union([z.string(), z.date()]),
            updated_at: z.union([z.string(), z.date()]),
          }),
          404: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  // POST /schedules
  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Create a new schedule',
        description: 'Creates a schedule with time slots. Validates for double-booking conflicts.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: z.object({
          class_id: z.number().int().positive(),
          school_subject_id: z.number().int().positive(),
          teacher_id: z.number().int().positive(),
          academic_year_id: z.number().int().positive(),
          semester: z.enum(['ganjil', 'genap']),
          status: z.enum(['scheduled', 'cancelled', 'rescheduled']).default('scheduled').optional(),
          room: z.string().max(50).optional().nullable(),
          time_slots: z.array(
            z.object({
              day_of_week: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']),
              start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
              end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
              room: z.string().max(50).optional().nullable(),
            })
          ).min(1, 'At least one time slot is required'),
        }).refine(
          (data) =>
            data.time_slots.every(
              (slot) => slot.start_time < slot.end_time
            ),
          { message: 'Each time slot must have start_time before end_time', path: ['time_slots'] }
        ),
        response: {
          201: z.object({
            id: z.number(),
            class_id: z.number(),
            school_subject_id: z.number(),
            teacher_id: z.number(),
            academic_year_id: z.number(),
            semester: z.enum(['ganjil', 'genap']),
            status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
            room: z.string().nullable(),
            class_name: z.string(),
            class_grade: z.string(),
            school_subject_name: z.string(),
            school_subject_code: z.string(),
            teacher_name: z.string().optional(),
            teacher_phone: z.string().nullable().optional(),
            teacher_specialization: z.string().nullable().optional(),
            academic_year_year: z.string(),
            academic_year_semester: z.string(),
            academic_year_start_date: z.union([z.string(), z.date()]),
            academic_year_end_date: z.union([z.string(), z.date()]),
            school_name: z.string(),
            created_at: z.union([z.string(), z.date()]),
            updated_at: z.union([z.string(), z.date()]),
          }),
          409: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  // PATCH /schedules/:id
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Update a schedule',
        description: 'Updates a schedule. Re-validates for conflicts if time/teacher/class changes.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ScheduleIdParamSchema,
        body: z.object({
          class_id: z.number().int().positive().optional(),
          school_subject_id: z.number().int().positive().optional(),
          teacher_id: z.number().int().positive().optional(),
          academic_year_id: z.number().int().positive().optional(),
          semester: z.enum(['ganjil', 'genap']).optional(),
          status: z.enum(['scheduled', 'cancelled', 'rescheduled']).optional(),
          room: z.string().max(50).optional().nullable(),
          time_slots: z.array(
            z.object({
              day_of_week: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']),
              start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
              end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
              room: z.string().max(50).optional().nullable(),
            })
          ).optional(),
        }).refine(
          (data) =>
            data.time_slots?.every(
              (slot) => slot.start_time < slot.end_time
            ) ?? true,
          { message: 'Each time slot must have start_time before end_time', path: ['time_slots'] }
        ),
        response: {
          200: z.object({
            id: z.number(),
            class_id: z.number(),
            school_subject_id: z.number(),
            teacher_id: z.number(),
            academic_year_id: z.number(),
            semester: z.enum(['ganjil', 'genap']),
            status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
            room: z.string().nullable(),
            class_name: z.string(),
            class_grade: z.string(),
            school_subject_name: z.string(),
            school_subject_code: z.string(),
            teacher_name: z.string().optional(),
            teacher_phone: z.string().nullable().optional(),
            teacher_specialization: z.string().nullable().optional(),
            academic_year_year: z.string(),
            academic_year_semester: z.string(),
            academic_year_start_date: z.union([z.string(), z.date()]),
            academic_year_end_date: z.union([z.string(), z.date()]),
            school_name: z.string(),
            created_at: z.union([z.string(), z.date()]),
            updated_at: z.union([z.string(), z.date()]),
          }),
          404: z.object({ error: z.string(), message: z.string() }),
          409: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  // DELETE /schedules/:id
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Delete a schedule',
        description: 'Deletes a schedule and cascades to all time slots.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ScheduleIdParamSchema,
        response: {
          204: z.object({ message: z.string() }),
          404: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )

  // ==================== CLASS SCHEDULES ====================

  // GET /schedules/class/:classId
  app.withTypeProvider<ZodTypeProvider>().get(
    '/class/:classId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Get schedules for a class',
        description: 'Returns all schedules for a specific class in an academic year and semester.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ScheduleClassPathParamSchema,
        querystring: z.object({
          academic_year_id: z.coerce.number().int().positive(),
          semester: z.enum(['ganjil', 'genep']).default('ganjil'),
        }),
        response: {
          200: z.object({
            data: z.array(z.object({
              id: z.number(),
              class_id: z.number(),
              school_subject_id: z.number(),
              teacher_id: z.number(),
              academic_year_id: z.number(),
              semester: z.enum(['ganjil', 'genap']),
              status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
              room: z.string().nullable(),
              created_at: z.string().or(z.date()),
              updated_at: z.string().or(z.date()),
            })),
          }),
        },
      },
    },
    bindHandler(controller.getByClass.bind(controller))
  )

  // ==================== TEACHER SCHEDULES ====================

  // GET /schedules/teacher/:teacherId
  app.withTypeProvider<ZodTypeProvider>().get(
    '/teacher/:teacherId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Get schedules for a teacher',
        description: 'Returns all schedules for a specific teacher in an academic year and semester.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ScheduleTeacherPathParamSchema,
        querystring: z.object({
          academic_year_id: z.coerce.number().int().positive(),
          semester: z.enum(['ganjil', 'genep']).default('ganjil'),
        }),
        response: {
          200: z.object({
            data: z.array(z.object({
              id: z.number(),
              class_id: z.number(),
              school_subject_id: z.number(),
              teacher_id: z.number(),
              academic_year_id: z.number(),
              semester: z.enum(['ganjil', 'genap']),
              status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
              room: z.string().nullable(),
              created_at: z.string().or(z.date()),
              updated_at: z.string().or(z.date()),
            })),
          }),
        },
      },
    },
    bindHandler(controller.getByTeacher.bind(controller))
  )

  // ==================== TIMETABLES ====================

  // GET /schedules/class/:classId/timetable
  app.withTypeProvider<ZodTypeProvider>().get(
    '/class/:classId/timetable',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Get weekly timetable for a class',
        description: 'Returns the weekly timetable grouped by day of the week.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ScheduleClassPathParamSchema,
        querystring: z.object({
          academic_year_id: z.coerce.number().int().positive(),
          semester: z.enum(['ganjil', 'genep']).default('ganjil'),
        }),
        response: {
          200: z.object({
            class_name: z.string(),
            class_grade: z.string(),
            academic_year_year: z.string(),
            semester: z.enum(['ganjil', 'genap']),
            days: z.object({
              senin: z.array(z.object({
                day_of_week: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']),
                start_time: z.string(),
                end_time: z.string(),
                room: z.string().nullable(),
                schedule: z.object({
                  id: z.number(),
                  class_id: z.number(),
                  school_subject_id: z.number(),
                  teacher_id: z.number(),
                  academic_year_id: z.number(),
                  semester: z.enum(['ganjil', 'genap']),
                  status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
                  room: z.string().nullable(),
                  class_name: z.string(),
                  class_grade: z.string(),
                  school_subject_name: z.string(),
                  school_subject_code: z.string(),
                  teacher_name: z.string().optional(),
                  created_at: z.union([z.string(), z.date()]),
                  updated_at: z.union([z.string(), z.date()]),
                }),
              })),
              selasa: z.array(z.any()),
              rabu: z.array(z.any()),
              kamis: z.array(z.any()),
              jumat: z.array(z.any()),
              sabtu: z.array(z.any()),
            }),
          }),
        },
      },
    },
    bindHandler(controller.getWeeklyTimetable.bind(controller))
  )

  // GET /schedules/teacher/:teacherId/timetable
  app.withTypeProvider<ZodTypeProvider>().get(
    '/teacher/:teacherId/timetable',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Get weekly timetable for a teacher',
        description: 'Returns the weekly timetable grouped by day for a specific teacher.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ScheduleTeacherPathParamSchema,
        querystring: z.object({
          academic_year_id: z.coerce.number().int().positive(),
          semester: z.enum(['ganjil', 'genep']).default('ganjil'),
        }),
        response: {
          200: z.object({
            class_name: z.string(),
            class_grade: z.string(),
            academic_year_year: z.string(),
            semester: z.enum(['ganjil', 'genap']),
            days: z.object({
              senin: z.array(z.any()),
              selasa: z.array(z.any()),
              rabu: z.array(z.any()),
              kamis: z.array(z.any()),
              jumat: z.array(z.any()),
              sabtu: z.array(z.any()),
            }),
          }),
        },
      },
    },
    bindHandler(controller.getTeacherWeeklyTimetable.bind(controller))
  )

  // ==================== CONFLICTS ====================

  // GET /schedules/conflicts
  app.withTypeProvider<ZodTypeProvider>().get(
    '/conflicts',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jadwal'],
        summary: 'Detect schedule conflicts',
        description: 'Lists all scheduling conflicts for auditing purposes.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: z.object({
          class_id: z.coerce.number().int().positive().optional(),
          teacher_id: z.coerce.number().int().positive().optional(),
          academic_year_id: z.coerce.number().int().positive().optional(),
          semester: z.enum(['ganjil', 'genep']).default('ganjil'),
        }),
        response: {
          200: z.object({
            data: z.array(z.object({
              schedule_id: z.number(),
              conflict_type: z.enum(['class', 'teacher', 'room']),
              conflicting_schedule_id: z.number(),
              day_of_week: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']),
              overlap_start: z.string(),
              overlap_end: z.string(),
              message: z.string(),
            })),
          }),
        },
      },
    },
    bindHandler(controller.detectConflicts.bind(controller))
  )
}
