// =====================================================
// School Routes — Thin registration of controller methods
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { SchoolController } from '../controllers/school.controller'
import {
  CreateSchoolSchema,
  UpdateSchoolSchema,
  SchoolFilterSchema,
} from '../validators/school.validator'

export const schoolRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SchoolController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = SchoolFilterSchema.parse(req.query) as typeof req.query },
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
      preValidation: async (req) => { req.body = CreateSchoolSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateSchoolSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}
