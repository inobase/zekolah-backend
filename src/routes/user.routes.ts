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
import { ContextHeadersSchema } from '../validators/common.validator'

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
        description:
          'Returns paginated list of user accounts. Supports `search` and `status` filters.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Creates a user account with role. Optionally links to an existing school/student/teacher record.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description: 'Returns user details including profile info and associated school.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description: 'Partial update — only provided fields are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Soft-deletes a user account by setting status to inactive. Does not delete linked records.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: UserIdParamSchema,
        response: { 200: UserDeleteResponseSchema },
      },
    },
    bindHandler(controller.deactivate.bind(controller))
  )
}
