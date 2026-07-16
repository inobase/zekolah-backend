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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
        params: TeachingAssignmentIdParamSchema,
        response: { 200: TeachingAssignmentDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}