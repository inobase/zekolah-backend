// =====================================================
// Attendance Routes — Thin registration
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { AttendanceController } from '../controllers/attendance.controller'
import {
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  AttendanceFilterSchema,
} from '../validators/attendance.validator'

export const attendanceRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AttendanceController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = AttendanceFilterSchema.parse(req.query) as typeof req.query },
    },
    controller.list
  )

  app.get(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.getById
  )

  app.post(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = CreateAttendanceSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateAttendanceSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}
