// =====================================================
// Grade Routes — Thin registration
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { GradeController } from '../controllers/grade.controller'
import {
  CreateGradeSchema,
  UpdateGradeSchema,
  GradeFilterSchema,
} from '../validators/grade.validator'

export const gradeRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new GradeController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = GradeFilterSchema.parse(req.query) as typeof req.query },
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
      preValidation: async (req) => { req.body = CreateGradeSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateGradeSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}
