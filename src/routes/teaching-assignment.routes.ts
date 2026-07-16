// =====================================================
// TeachingAssignment Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { TeachingAssignmentController } from '../controllers/teaching-assignment.controller'
import {
  CreateTeachingAssignmentSchema,
  UpdateTeachingAssignmentSchema,
  TeachingAssignmentFilterSchema,
  TeachingAssignmentResponseSchema,
  PaginatedTeachingAssignmentsResponseSchema,
  TeachingAssignmentDeleteResponseSchema,
  TeachingAssignmentIdParamSchema,
} from '../validators/teaching-assignment.validator'

import { ContextHeadersSchema } from '../validators/common.validator';
function bindHandler(handler: any) {
  return handler
}

export const teachingAssignmentRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new TeachingAssignmentController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teaching-assignments'],
        summary: 'List all teaching assignments',
        description:
          'Returns paginated teaching assignments (teacher → class → subject → academic year).',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: TeachingAssignmentFilterSchema,
        response: { 200: PaginatedTeachingAssignmentsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teaching-assignments'],
        summary: 'Get teaching assignment by ID',
        description: 'Returns teaching assignment details.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: TeachingAssignmentIdParamSchema,
        response: { 200: TeachingAssignmentResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teaching-assignments'],
        summary: 'Create a new teaching assignment',
        description:
          'Assigns a teacher to teach a specific subject in a class for an academic year.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: CreateTeachingAssignmentSchema,
        response: { 201: TeachingAssignmentResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teaching-assignments'],
        summary: 'Update teaching assignment by ID',
        description:
          'Partial update — only fields present in the body are modified.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: TeachingAssignmentIdParamSchema,
        body: UpdateTeachingAssignmentSchema,
        response: { 200: TeachingAssignmentResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['teaching-assignments'],
        summary: 'Delete teaching assignment',
        description: 'Hard-deletes a teaching assignment.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: TeachingAssignmentIdParamSchema,
        response: { 200: TeachingAssignmentDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}