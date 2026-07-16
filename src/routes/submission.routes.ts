// =====================================================
// Submission Routes — Thin registration
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { SubmissionController } from '../controllers/submission.controller'
import {
  CreateSubmissionSchema,
  UpdateSubmissionSchema,
  SubmissionFilterSchema,
  SubmissionResponseSchema,
  PaginatedSubmissionsResponseSchema,
  SubmissionDeleteResponseSchema,
  SubmissionIdParamSchema,
} from '../validators/submission.validator'

import { ContextHeadersSchema } from '../validators/common.validator';
function bindHandler(handler: any) {
  return handler
}

export const submissionRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SubmissionController(knex)

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['submissions'],
        summary: 'List all submissions',
        description:
          'Returns paginated submissions. Filters by `assignment_id`, `student_id`, `status`.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: SubmissionFilterSchema,
        response: { 200: PaginatedSubmissionsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['submissions'],
        summary: 'Get submission by ID',
        description: 'Returns submission details including grade/score if graded.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SubmissionIdParamSchema,
        response: { 200: SubmissionResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['submissions'],
        summary: 'Create a new submission',
        description:
          'Student submits work for an assignment. One submission per assignment per student.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: CreateSubmissionSchema,
        response: { 201: SubmissionResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['submissions'],
        summary: 'Update submission by ID',
        description:
          'Partial update. Teacher can set score and feedback via `grade` and `feedback`.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SubmissionIdParamSchema,
        body: UpdateSubmissionSchema,
        response: { 200: SubmissionResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['submissions'],
        summary: 'Delete submission',
        description: 'Hard-deletes a submission record.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SubmissionIdParamSchema,
        response: { 200: SubmissionDeleteResponseSchema },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )
}