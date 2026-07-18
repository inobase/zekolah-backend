// =====================================================
// School Program Routes — Schools activate programs & specializations
// SCHOOL_ADMIN scope (scoped via school_id from route + authenticate)
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { SchoolProgramController } from '../controllers/schoolProgram.controller'
import { ContextHeadersSchema } from '../validators/common.validator'
import { z } from 'zod'

function bindHandler(handler: any) {
  return handler
}

export const schoolProgramRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SchoolProgramController(knex)

  const schoolIdParam = z.object({
    schoolId: z.string().regex(/^\d+$/).transform(Number),
  })

  const specIdParam = z.object({
    specId: z.string().regex(/^\d+$/).transform(Number),
  })

  // ==================== SCHOOL PROGRAMS ====================

  // GET /schools/:schoolId/programs
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:schoolId/programs',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'List programs for a school',
        description: 'Returns all programs (active and inactive) linked to a school.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: schoolIdParam,
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  // GET /schools/:schoolId/programs/available
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:schoolId/programs/available',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'List available programs for school adoption',
        description: 'Returns programs that match the school\'s education_level. Schools can adopt these.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: schoolIdParam,
      },
    },
    bindHandler(controller.getAvailable.bind(controller))
  )

  // POST /schools/:schoolId/programs/activate
  app.withTypeProvider<ZodTypeProvider>().post(
    '/:schoolId/programs/activate',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Activate a program for a school',
        description:
          'Activates a program for the given school. Program education_level must match the school\'s education_level.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: schoolIdParam,
        body: z.object({
          program_id: z.number().int().positive(),
        }),
        response: {
          201: z.record(z.any()),
        },
      },
    },
    bindHandler(controller.activate.bind(controller))
  )

  // DELETE /schools/:schoolId/programs/:programId
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:schoolId/programs/:programId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Deactivate a school program',
        description: 'Soft deactivates a school program and cascades to its specializations.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: z.string().regex(/^\d+$/).transform(Number),
          programId: z.string().regex(/^\d+$/).transform(Number),
        }),
      },
    },
    bindHandler(controller.deactivate.bind(controller))
  )

  // ==================== SCHOOL SPECIALIZATIONS ====================

  // GET /schools/:schoolId/programs/:schoolProgramId/specializations
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:schoolId/programs/:schoolProgramId/specializations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'List school specializations',
        description: 'Returns all specializations (active and inactive) linked to a school program.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: z.string().regex(/^\d+$/).transform(Number),
          schoolProgramId: z.string().regex(/^\d+$/).transform(Number),
        }),
      },
    },
    bindHandler(controller.listSpecializations.bind(controller))
  )

  // POST /schools/:schoolId/programs/:schoolProgramId/specializations/activate
  app.withTypeProvider<ZodTypeProvider>().post(
    '/:schoolId/programs/:schoolProgramId/specializations/activate',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Activate a specialization for a school program',
        description: 'Links a specialization to a school\'s program.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: z.string().regex(/^\d+$/).transform(Number),
          schoolProgramId: z.string().regex(/^\d+$/).transform(Number),
        }),
        body: z.object({
          specialization_id: z.number().int().positive(),
        }),
        response: {
          201: z.object({
            id: z.number(),
            school_program_id: z.number(),
            specialization_id: z.number(),
          }),
        },
      },
    },
    bindHandler(controller.activateSpecialization.bind(controller))
  )

  // DELETE /schools/:schoolId/programs/:schoolProgramId/specializations/:specId
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:schoolId/programs/:schoolProgramId/specializations/:specId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Deactivate a school specialization',
        description: 'Soft deactivates a specialization linkage.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: z.string().regex(/^\d+$/).transform(Number),
          schoolProgramId: z.string().regex(/^\d+$/).transform(Number),
          specId: z.string().regex(/^\d+$/).transform(Number),
        }),
      },
    },
    bindHandler(controller.deactivateSpecialization.bind(controller))
  )
}
