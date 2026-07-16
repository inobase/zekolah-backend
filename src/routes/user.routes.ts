// =====================================================
// User Routes — Thin registration of controller methods
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { UserController } from '../controllers/user.controller'
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserFilterSchema,
  UserResponseSchema,
  PaginatedUsersResponseSchema,
  UserDeleteResponseSchema,
  UserIdParamSchema,
} from '../validators/user.validator'

function bindHandler(handler: any) {
  return handler
}

export const userRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new UserController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['users'],
        summary: 'List all users',
        security: [{ bearerAuth: [] }],
        querystring: UserFilterSchema,
        response: { 200: PaginatedUsersResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Create a new user',
        security: [{ bearerAuth: [] }],
        body: CreateUserSchema,
        response: { 201: UserResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        params: UserIdParamSchema,
        response: { 200: UserResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Update user by ID',
        security: [{ bearerAuth: [] }],
        params: UserIdParamSchema,
        body: UpdateUserSchema,
        response: { 200: UserResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Deactivate user by ID',
        security: [{ bearerAuth: [] }],
        params: UserIdParamSchema,
        response: { 200: UserDeleteResponseSchema },
      },
    },
    bindHandler(controller.deactivate.bind(controller))
  )
}
