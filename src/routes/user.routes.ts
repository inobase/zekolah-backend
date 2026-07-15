// =====================================================
// User Routes — Thin registration of controller methods
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { UserController } from '../controllers/user.controller'
import {
  UpdateUserSchema,
  UserFilterSchema,
} from '../validators/user.validator'

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new UserController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = UserFilterSchema.parse(req.query) as typeof req.query },
    },
    controller.list
  )

  app.get(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.getById
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateUserSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.deactivate
  )
}
