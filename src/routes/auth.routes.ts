// =====================================================
// Auth Routes
// Public endpoints: register, login
// Protected endpoints: me, logout
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { AuthController } from '../controllers/auth.controller'
import {
  LoginSchema,
  RegisterSchema,
  AuthTokenResponseSchema,
  LogoutResponseSchema,
  SafeUserSchema,
} from '../validators/auth.validator'

// Helper to bind controller methods with zod type provider types
function bindHandler(
  handler: (req: any, reply: any) => Promise<any>
): (req: any, reply: any) => Promise<any> {
  return handler
}

export const authRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AuthController(knex)

  // Public
  app.withTypeProvider<ZodTypeProvider>().post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        body: RegisterSchema,
        response: {
          201: AuthTokenResponseSchema,
        },
      },
    },
    bindHandler(controller.register.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Login and get JWT token',
        body: LoginSchema,
        response: {
          200: AuthTokenResponseSchema,
        },
      },
    },
    bindHandler(controller.login.bind(controller))
  )

  // Protected
  app.withTypeProvider<ZodTypeProvider>().get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get current authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: SafeUserSchema,
        },
      },
    },
    bindHandler(controller.me.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/logout',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Logout and revoke refresh tokens',
        security: [{ bearerAuth: [] }],
        response: {
          200: LogoutResponseSchema,
        },
      },
    },
    bindHandler(controller.logout.bind(controller))
  )
}
