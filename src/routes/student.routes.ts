// =====================================================
// Student Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { StudentController } from '../controllers/student.controller'
import {
  CreateStudentSchema,
  UpdateStudentSchema,
  StudentFilterSchema,
  StudentResponseSchema,
  PaginatedStudentsResponseSchema,
  StudentDeleteResponseSchema,
  StudentIdParamSchema,
} from '../validators/student.validator'

function bindHandler(handler: any) {
  return handler
}

export const studentRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new StudentController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['students'],
        summary: 'List all students',
        security: [{ bearerAuth: [] }],
        querystring: StudentFilterSchema,
        response: { 200: PaginatedStudentsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['students'],
        summary: 'Get student by ID',
        security: [{ bearerAuth: [] }],
        params: StudentIdParamSchema,
        response: { 200: StudentResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['students'],
        summary: 'Create a new student',
        security: [{ bearerAuth: [] }],
        body: CreateStudentSchema,
        response: { 201: StudentResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['students'],
        summary: 'Update student by ID',
        security: [{ bearerAuth: [] }],
        params: StudentIdParamSchema,
        body: UpdateStudentSchema,
        response: { 200: StudentResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['students'],
        summary: 'Delete student by ID',
        security: [{ bearerAuth: [] }],
        params: StudentIdParamSchema,
        response: { 204: StudentDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
