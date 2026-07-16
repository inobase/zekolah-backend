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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
        params: AcademicYearIdParamSchema,
        response: { 204: AcademicYearDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
