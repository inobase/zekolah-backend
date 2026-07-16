// =====================================================
// TeachingAssignment Routes — Thin registration
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { TeachingAssignmentController } from '../controllers/teaching-assignment.controller'
import {
  CreateTeachingAssignmentSchema,
  UpdateTeachingAssignmentSchema,
  TeachingAssignmentFilterSchema,
} from '../validators/teaching-assignment.validator'

export const teachingAssignmentRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new TeachingAssignmentController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = TeachingAssignmentFilterSchema.parse(req.query) as typeof req.query },
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
      preValidation: async (req) => { req.body = CreateTeachingAssignmentSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateTeachingAssignmentSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}