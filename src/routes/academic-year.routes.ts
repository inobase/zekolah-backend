// =====================================================
// Academic Year Routes — Thin registration
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { AcademicYearController } from '../controllers/academic-year.controller'
import {
  CreateAcademicYearSchema,
  UpdateAcademicYearSchema,
  AcademicYearFilterSchema,
} from '../validators/academic-year.validator'

export const academicYearRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AcademicYearController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = AcademicYearFilterSchema.parse(req.query) as typeof req.query },
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
      preValidation: async (req) => { req.body = CreateAcademicYearSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateAcademicYearSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}
