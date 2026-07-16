// =====================================================
// Teacher Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { TeacherController } from '../controllers/teacher.controller'
import {
  CreateTeacherSchema,
  UpdateTeacherSchema,
  TeacherFilterSchema,
  TeacherResponseSchema,
  PaginatedTeachersResponseSchema,
  TeacherDeleteResponseSchema,
  TeacherIdParamSchema,
} from '../validators/teacher.validator'

function bindHandler(handler: any) {
  return handler
}

export const teacherRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new TeacherController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teachers'],
        summary: 'List all teachers',
        security: [{ bearerAuth: [] }],
        querystring: TeacherFilterSchema,
        response: { 200: PaginatedTeachersResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teachers'],
        summary: 'Get teacher by ID',
        security: [{ bearerAuth: [] }],
        params: TeacherIdParamSchema,
        response: { 200: TeacherResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teachers'],
        summary: 'Create a new teacher',
        security: [{ bearerAuth: [] }],
        body: CreateTeacherSchema,
        response: { 201: TeacherResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teachers'],
        summary: 'Update teacher by ID',
        security: [{ bearerAuth: [] }],
        params: TeacherIdParamSchema,
        body: UpdateTeacherSchema,
        response: { 200: TeacherResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teachers'],
        summary: 'Delete teacher by ID',
        security: [{ bearerAuth: [] }],
        params: TeacherIdParamSchema,
        response: { 204: TeacherDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
