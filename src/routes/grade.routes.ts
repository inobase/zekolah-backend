// =====================================================
// Grade Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { GradeController } from '../controllers/grade.controller'
import {
  CreateGradeSchema,
  UpdateGradeSchema,
  GradeFilterSchema,
  GradeResponseSchema,
  PaginatedGradesResponseSchema,
  GradeDeleteResponseSchema,
  GradeIdParamSchema,
} from '../validators/grade.validator'

function bindHandler(handler: any) {
  return handler
}

export const gradeRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new GradeController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['grades'],
        summary: 'List all grades',
        security: [{ bearerAuth: [] }],
        querystring: GradeFilterSchema,
        response: { 200: PaginatedGradesResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['grades'],
        summary: 'Get grade by ID',
        security: [{ bearerAuth: [] }],
        params: GradeIdParamSchema,
        response: { 200: GradeResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['grades'],
        summary: 'Create a new grade',
        security: [{ bearerAuth: [] }],
        body: CreateGradeSchema,
        response: { 201: GradeResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['grades'],
        summary: 'Update grade by ID',
        security: [{ bearerAuth: [] }],
        params: GradeIdParamSchema,
        body: UpdateGradeSchema,
        response: { 200: GradeResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['grades'],
        summary: 'Delete grade',
        security: [{ bearerAuth: [] }],
        params: GradeIdParamSchema,
        response: { 200: GradeDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
