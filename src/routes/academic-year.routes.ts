// =====================================================
// Academic Year Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { AcademicYearController } from '../controllers/academic-year.controller'
import {
  CreateAcademicYearSchema,
  UpdateAcademicYearSchema,
  AcademicYearFilterSchema,
  AcademicYearResponseSchema,
  PaginatedAcademicYearsResponseSchema,
  AcademicYearDeleteResponseSchema,
  AcademicYearIdParamSchema,
} from '../validators/academic-year.validator'

import { ContextHeadersSchema } from '../validators/common.validator';
function bindHandler(handler: any) {
  return handler
}

export const academicYearRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AcademicYearController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['academic-years'],
        summary: 'List all academic years',
        description:
          'Returns paginated list of academic years for a school. Filter by `is_active`.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: AcademicYearFilterSchema,
        response: { 200: PaginatedAcademicYearsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['academic-years'],
        summary: 'Get academic year by ID',
        description: 'Returns academic year details.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AcademicYearIdParamSchema,
        response: { 200: AcademicYearResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['academic-years'],
        summary: 'Create a new academic year',
        description:
          'Creates an academic year. Only one academic year per school can have `is_active=true`.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: CreateAcademicYearSchema,
        response: { 201: AcademicYearResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['academic-years'],
        summary: 'Update academic year by ID',
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AcademicYearIdParamSchema,
        body: UpdateAcademicYearSchema,
        response: { 200: AcademicYearResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['academic-years'],
        summary: 'Delete academic year by ID',
        description:
          'Hard-deletes an academic year. Fails if it has dependent records (classes, teaching assignments, grades).',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AcademicYearIdParamSchema,
        response: { 204: AcademicYearDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
