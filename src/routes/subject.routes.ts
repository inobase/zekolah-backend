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

import { ContextHeadersSchema } from '../validators/common.validator';
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
        description:
          'Returns paginated list of subjects. Filters by `search` and `school_id`.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description: 'Returns subject details.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Creates a subject record. `code` must be unique within the school.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Hard-deletes a subject. Fails with 409 if classes are linked or grades exist.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SubjectIdParamSchema,
        response: { 204: SubjectDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
