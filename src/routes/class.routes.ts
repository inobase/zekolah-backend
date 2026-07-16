// =====================================================
// Class Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { ClassController } from '../controllers/class.controller'
import {
  CreateClassSchema,
  UpdateClassSchema,
  ClassFilterSchema,
  ClassResponseSchema,
  PaginatedClassesResponseSchema,
  ClassDeleteResponseSchema,
  ClassIdParamSchema,
} from '../validators/class.validator'

function bindHandler(handler: any) {
  return handler
}

export const classRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new ClassController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['classes'],
        summary: 'List all classes',
        description:
          'Returns paginated list of classes. Supports `search` filter within a school.',
        security: [{ bearerAuth: [] }],
        querystring: ClassFilterSchema,
        response: { 200: PaginatedClassesResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['classes'],
        summary: 'Get class by ID',
        description: 'Returns class details including student and teacher counts.',
        security: [{ bearerAuth: [] }],
        params: ClassIdParamSchema,
        response: { 200: ClassResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['classes'],
        summary: 'Create a new class',
        description:
          'Creates a class within a school. Assigns a class advisor teacher. `name` must be unique within the school.',
        security: [{ bearerAuth: [] }],
        body: CreateClassSchema,
        response: { 201: ClassResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['classes'],
        summary: 'Update class by ID',
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        params: ClassIdParamSchema,
        body: UpdateClassSchema,
        response: { 200: ClassResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['classes'],
        summary: 'Delete class by ID',
        description:
          'Hard-deletes a class. Fails with 409 if students are still enrolled.',
        security: [{ bearerAuth: [] }],
        params: ClassIdParamSchema,
        response: { 204: ClassDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}