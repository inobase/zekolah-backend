// =====================================================
// Auth Routes
// Public endpoints: register, login
// Protected endpoints: me, logout
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { AuthController } from '../controllers/auth.controller'
import { LoginSchema, RegisterSchema } from '../validators/auth.validator'

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AuthController(knex)

  // Public
  app.post(
    '/register',
    { preValidation: async (req) => { req.body = RegisterSchema.parse(req.body) } },
    controller.register
  )

  app.post(
    '/login',
    { preValidation: async (req) => { req.body = LoginSchema.parse(req.body) } },
    controller.login
  )

  // Protected
  app.get(
    '/me',
    { onRequest: [app.authenticate] },
    controller.me
  )

  app.post(
    '/logout',
    { onRequest: [app.authenticate] },
    controller.logout
  )
}
