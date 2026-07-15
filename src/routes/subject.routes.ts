// =====================================================
// Subject Routes — Thin registration of controller methods
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { SubjectController } from '../controllers/subject.controller'
import {
  CreateSubjectSchema,
  UpdateSubjectSchema,
  SubjectFilterSchema,
} from '../validators/subject.validator'

export const subjectRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SubjectController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = SubjectFilterSchema.parse(req.query) as typeof req.query },
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
      preValidation: async (req) => { req.body = CreateSubjectSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateSubjectSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}
