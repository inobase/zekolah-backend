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

import { ContextHeadersSchema } from '../validators/common.validator';
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
        description:
          'Returns a paginated list of students. Filters by `search`, `class_id`. Supports pagination.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description: 'Returns student details including user account info.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Creates a student record and associated user account with student role. Requires valid class_id.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
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
        description:
          'Hard-deletes student and associated user account. Deletes class_student membership first.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: StudentIdParamSchema,
        response: { 204: StudentDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
