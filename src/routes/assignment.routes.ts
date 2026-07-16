// =====================================================
// Assignment Routes — Thin registration
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { AssignmentController } from '../controllers/assignment.controller'
import {
  CreateAssignmentSchema,
  UpdateAssignmentSchema,
  AssignmentFilterSchema,
} from '../validators/assignment.validator'

export const assignmentRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AssignmentController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = AssignmentFilterSchema.parse(req.query) as typeof req.query },
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
      preValidation: async (req) => { req.body = CreateAssignmentSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateAssignmentSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}
