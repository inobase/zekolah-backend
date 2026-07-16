// =====================================================
// Subject Routes — Thin registration of controller methods
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { SubjectController } from '../controllers/subject.controller'
import {
  CreateSubjectSchema,
  UpdateSubjectSchema,
  SubjectFilterSchema,
  SubjectResponseSchema,
  PaginatedSubjectsResponseSchema,
  SubjectDeleteResponseSchema,
  SubjectIdParamSchema,
} from '../validators/subject.validator'

function bindHandler(handler: any) {
  return handler
}

export const subjectRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SubjectController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subjects'],
        summary: 'List all subjects',
        security: [{ bearerAuth: [] }],
        querystring: SubjectFilterSchema,
        response: { 200: PaginatedSubjectsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subjects'],
        summary: 'Get subject by ID',
        security: [{ bearerAuth: [] }],
        params: SubjectIdParamSchema,
        response: { 200: SubjectResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subjects'],
        summary: 'Create a new subject',
        security: [{ bearerAuth: [] }],
        body: CreateSubjectSchema,
        response: { 201: SubjectResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subjects'],
        summary: 'Update subject by ID',
        security: [{ bearerAuth: [] }],
        params: SubjectIdParamSchema,
        body: UpdateSubjectSchema,
        response: { 200: SubjectResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subjects'],
        summary: 'Delete subject by ID',
        security: [{ bearerAuth: [] }],
        params: SubjectIdParamSchema,
        response: { 204: SubjectDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
