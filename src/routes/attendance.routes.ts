// =====================================================
// Attendance Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { AttendanceController } from '../controllers/attendance.controller'
import {
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  AttendanceFilterSchema,
  AttendanceResponseSchema,
  PaginatedAttendancesResponseSchema,
  AttendanceDeleteResponseSchema,
  AttendanceIdParamSchema,
} from '../validators/attendance.validator'

import { ContextHeadersSchema } from '../validators/common.validator';
function bindHandler(handler: any) {
  return handler
}

export const attendanceRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AttendanceController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['attendances'],
        summary: 'List all attendances',
        description:
          'Returns paginated attendance records. Filters by `student_id`, `class_id`, `date`.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: AttendanceFilterSchema,
        response: { 200: PaginatedAttendancesResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['attendances'],
        summary: 'Get attendance by ID',
        description: 'Returns attendance details for a student on a specific date.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AttendanceIdParamSchema,
        response: { 200: AttendanceResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['attendances'],
        summary: 'Create a new attendance',
        description:
          'Records attendance for a student. Status: present | absent | late | sick | permission.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: CreateAttendanceSchema,
        response: { 201: AttendanceResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['attendances'],
        summary: 'Update attendance by ID',
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AttendanceIdParamSchema,
        body: UpdateAttendanceSchema,
        response: { 200: AttendanceResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['attendances'],
        summary: 'Delete attendance',
        description: 'Hard-deletes an attendance record.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AttendanceIdParamSchema,
        response: { 200: AttendanceDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
