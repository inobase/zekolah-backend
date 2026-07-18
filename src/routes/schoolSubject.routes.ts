// =====================================================
// School Subject Routes — School-level subjects CRUD
// SCHOOL_ADMIN scope (scoped via :schoolId route param)
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { SchoolSubjectController } from '../controllers/schoolSubject.controller'
import { ContextHeadersSchema } from '../validators/common.validator'
import { z } from 'zod'

function bindHandler(handler: any) {
  return handler
}

export const schoolSubjectRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new SchoolSubjectController(knex)

  const schoolIdParam = z.object({
    schoolId: z.string().regex(/^\d+$/).transform(Number),
  })

  const subjectIdParam = z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })

  const specIdParam = z.object({
    specId: z.string().regex(/^\d+$/).transform(Number),
  })

  // ==================== SCHOOL SUBJECTS ====================

  // GET /schools/:schoolId/subjects
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:schoolId/subjects',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'List school subjects for a school',
        description: 'Returns paginated list of subjects for the school.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: schoolIdParam,
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().default(50),
          specialization_id: z.coerce.number().int().positive().optional(),
          subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']).optional(),
          search: z.string().optional().default(''),
        }),
        response: {
          200: z.object({
            data: z.array(z.object({
              id: z.number(),
              school_id: z.number(),
              specialization_id: z.number(),
              name: z.string(),
              code: z.string(),
              subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']),
              jp_per_minggu: z.number(),
              jp_per_semester: z.number(),
              theory_hours: z.number(),
              practice_hours: z.number(),
              customizable: z.coerce.boolean(),
              created_at: z.string().or(z.date()),
              updated_at: z.string().or(z.date()),
            })),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  // GET /schools/:schoolId/subjects/:id
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:schoolId/subjects/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Get school subject by ID',
        description: 'Returns details for one school subject.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: schoolIdParam.shape.schoolId,
          id: subjectIdParam.shape.id,
        }),
        response: {
          200: z.object({
            id: z.number(),
            school_id: z.number(),
            specialization_id: z.number(),
            name: z.string(),
            code: z.string(),
            subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']),
            jp_per_minggu: z.number(),
            jp_per_semester: z.number(),
            theory_hours: z.number(),
            practice_hours: z.number(),
            customizable: z.coerce.boolean(),
            created_at: z.string().or(z.date()),
            updated_at: z.string().or(z.date()),
          }),
          404: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  // POST /schools/:schoolId/subjects
  app.withTypeProvider<ZodTypeProvider>().post(
    '/:schoolId/subjects',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Create school subject',
        description: 'Creates a subject for the school.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: schoolIdParam,
        body: z.object({
          specialization_id: z.coerce.number().int().positive(),
          name: z.string().min(1).max(200),
          code: z.string().min(1).max(50),
          subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']),
          jp_per_minggu: z.coerce.number().int().positive(),
          jp_per_semester: z.coerce.number().int().optional(),
          theory_hours: z.coerce.number().int().nonnegative().optional(),
          practice_hours: z.coerce.number().int().nonnegative().optional(),
          customizable: z.boolean().optional(),
        }),
        response: {
          201: z.object({
            id: z.number(),
            school_id: z.number(),
            specialization_id: z.number(),
            name: z.string(),
            code: z.string(),
            subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']),
            jp_per_minggu: z.number(),
            jp_per_semester: z.number(),
            theory_hours: z.number(),
            practice_hours: z.number(),
            customizable: z.coerce.boolean(),
            created_at: z.string().or(z.date()),
            updated_at: z.string().or(z.date()),
          }),
        },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  // PATCH /schools/:schoolId/subjects/:id
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:schoolId/subjects/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Update school subject',
        description: 'Partial update for a school subject.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: schoolIdParam.shape.schoolId,
          id: subjectIdParam.shape.id,
        }),
        body: z.object({
          name: z.string().min(1).max(200).optional(),
          code: z.string().min(1).max(50).optional(),
          subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']).optional(),
          jp_per_minggu: z.coerce.number().int().positive().optional(),
          jp_per_semester: z.coerce.number().int().optional(),
          theory_hours: z.coerce.number().int().nonnegative().optional(),
          practice_hours: z.coerce.number().int().nonnegative().optional(),
          customizable: z.boolean().optional(),
        }),
        response: {
          200: z.object({
            id: z.number(),
            school_id: z.number(),
            specialization_id: z.number(),
            name: z.string(),
            code: z.string(),
            subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']),
            jp_per_minggu: z.number(),
            jp_per_semester: z.number(),
            theory_hours: z.number(),
            practice_hours: z.number(),
            customizable: z.coerce.boolean(),
            created_at: z.string().or(z.date()),
            updated_at: z.string().or(z.date()),
          }),
        },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  // DELETE /schools/:schoolId/subjects/:id
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:schoolId/subjects/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Delete school subject',
        description: 'Deletes a school subject.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: schoolIdParam.shape.schoolId,
          id: subjectIdParam.shape.id,
        }),
        response: {
          204: z.object({ message: z.string() }),
        },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )

  // GET /schools/:schoolId/specializations/:specId/subjects
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:schoolId/specializations/:specId/subjects',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'List subjects for a specialization',
        description: 'Returns all subjects for a specific specialization.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: z.object({
          schoolId: schoolIdParam.shape.schoolId,
          specId: specIdParam.shape.specId,
        }),
        response: {
          200: z.object({
            data: z.array(z.object({
              id: z.number(),
              school_id: z.number(),
              specialization_id: z.number(),
              name: z.string(),
              code: z.string(),
              subject_type: z.enum(['UMUM', 'DD', 'DP', 'SP']),
              jp_per_minggu: z.number(),
              jp_per_semester: z.number(),
              theory_hours: z.number(),
              practice_hours: z.number(),
              customizable: z.coerce.boolean(),
              created_at: z.string().or(z.date()),
              updated_at: z.string().or(z.date()),
            })),
          }),
        },
      },
    },
    bindHandler(controller.listBySpecialization.bind(controller))
  )
}
