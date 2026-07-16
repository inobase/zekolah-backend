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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
        params: AttendanceIdParamSchema,
        response: { 200: AttendanceDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
