// =====================================================
// Assignment Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { AssignmentController } from '../controllers/assignment.controller'
import {
  CreateAssignmentSchema,
  UpdateAssignmentSchema,
  AssignmentFilterSchema,
  AssignmentResponseSchema,
  PaginatedAssignmentsResponseSchema,
  AssignmentDeleteResponseSchema,
  AssignmentIdParamSchema,
} from '../validators/assignment.validator'

import { ContextHeadersSchema } from '../validators/common.validator';
function bindHandler(handler: any) {
  return handler
}

export const assignmentRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new AssignmentController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['assignments'],
        summary: 'List all assignments',
        description:
          'Returns paginated assignments. Filters by `class_id`, `grade_id`, `academic_year_id`.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: AssignmentFilterSchema,
        response: { 200: PaginatedAssignmentsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['assignments'],
        summary: 'Get assignment by ID',
        description: 'Returns assignment details including grade and class info.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AssignmentIdParamSchema,
        response: { 200: AssignmentResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['assignments'],
        summary: 'Create a new assignment',
        description:
          'Creates an assignment linked to a class and academic year.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: CreateAssignmentSchema,
        response: { 201: AssignmentResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['assignments'],
        summary: 'Update assignment by ID',
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AssignmentIdParamSchema,
        body: UpdateAssignmentSchema,
        response: { 200: AssignmentResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['assignments'],
        summary: 'Delete assignment',
        description: 'Hard-deletes an assignment. Existing submissions are unaffected.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: AssignmentIdParamSchema,
        response: { 200: AssignmentDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
