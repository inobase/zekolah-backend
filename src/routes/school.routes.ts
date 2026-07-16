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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
        params: SchoolIdParamSchema,
        response: { 204: SchoolDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
