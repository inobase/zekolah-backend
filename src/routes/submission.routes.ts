// =====================================================
// Submission Routes — Thin registration
// =====================================================

import { FastifyInstance } from 'fastify'
import { getKnex } from '../config/database'
import { SubmissionController } from '../controllers/submission.controller'
import {
  CreateSubmissionSchema,
  UpdateSubmissionSchema,
  SubmissionFilterSchema,
} from '../validators/submission.validator'

export const submissionRoutes = async (app: FastifyInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SubmissionController(knex)

  app.get(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.query = SubmissionFilterSchema.parse(req.query) as typeof req.query },
    },
    controller.list
  )

  app.get(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.getById
  )

  app.post(
    '/',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = CreateSubmissionSchema.parse(req.body) },
    },
    controller.create
  )

  app.patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      preValidation: async (req) => { req.body = UpdateSubmissionSchema.parse(req.body) },
    },
    controller.update
  )

  app.delete(
    '/:id',
    { onRequest: [app.authenticate] },
    controller.delete
  )
}