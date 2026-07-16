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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
        params: AssignmentIdParamSchema,
        response: { 200: AssignmentDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}
