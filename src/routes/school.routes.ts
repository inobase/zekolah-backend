// =====================================================
// School Routes — Thin registration of controller methods
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { SchoolController } from '../controllers/school.controller'
import {
  CreateSchoolSchema,
  UpdateSchoolSchema,
  SchoolFilterSchema,
  SchoolResponseSchema,
  PaginatedSchoolsResponseSchema,
  SchoolDeleteResponseSchema,
  SchoolIdParamSchema,
} from '../validators/school.validator'

import { ContextHeadersSchema } from '../validators/common.validator';
function bindHandler(handler: any) {
  return handler
}

export const schoolRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SchoolController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['schools'],
        summary: 'List all schools',
        description:
          'Returns a paginated list of schools. Supports `search`, `page`, `limit` query params.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: SchoolFilterSchema,
        response: { 200: PaginatedSchoolsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['schools'],
        summary: 'Get school by ID',
        description: 'Returns details for one school. Returns 404 if not found.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SchoolIdParamSchema,
        response: { 200: SchoolResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['schools'],
        summary: 'Create a new school',
        description:
          'Creates a school record. `code` must be unique across the system.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: CreateSchoolSchema,
        response: { 201: SchoolResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['schools'],
        summary: 'Update school by ID',
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SchoolIdParamSchema,
        body: UpdateSchoolSchema,
        response: { 200: SchoolResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['schools'],
        summary: 'Delete school by ID',
        description:
          'Hard-deletes a school. Fails with 409 if dependent records exist (students, teachers, classes).',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SchoolIdParamSchema,
        response: { 204: SchoolDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
