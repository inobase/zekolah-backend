// =====================================================
// Program Routes — Jurusan (SMK/MAK/PT) CRUD
// SUPER_ADMIN only
// =====================================================

import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyZodInstance } from '../types/fastify-zod'
import { getKnex } from '../config/database'
import { ProgramController } from '../controllers/program.controller'
import {
  ProgramFilterSchema,
  ProgramIdSchema,
  ProgramCreateSchema,
  ProgramUpdateSchema,
  ProgramResponseSchema,
  PaginatedProgramsResponseSchema,
  ProgramParamSchema,
  SpecializationCreateSchema,
  SpecializationUpdateSchema,
  SpecializationResponseSchema,
  PaginatedSpecializationsResponseSchema,
  SpecializationParamSchema,
} from '../validators/jurusan.validator'
import { z } from 'zod'
import { ContextHeadersSchema } from '../validators/common.validator'

function bindHandler(handler: any) {
  return handler
}

export const programRoutes = async (app: FastifyZodInstance): Promise<void> => {
  const knex = getKnex()
  const controller = new ProgramController(knex)

  // ==================== PROGRAMS ====================

  // GET /programs
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'List program keahlian',
        description: 'Returns a paginated list of program keahlian (jurusan) for SMK/MAK/PT.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        querystring: ProgramFilterSchema,
        response: { 200: PaginatedProgramsResponseSchema },
      },
    },
    bindHandler(controller.list.bind(controller))
  )

  // GET /programs/:id
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Get program keahlian by ID',
        description: 'Returns details for one program. Returns 404 if not found.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ProgramIdSchema,
        response: { 200: ProgramResponseSchema },
      },
    },
    bindHandler(controller.getById.bind(controller))
  )

  // POST /programs
  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Create program keahlian',
        description: 'Creates a program keahlian. `code` must be unique.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        body: ProgramCreateSchema,
        response: { 201: ProgramResponseSchema },
      },
    },
    bindHandler(controller.create.bind(controller))
  )

  // PATCH /programs/:id
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Update program keahlian by ID',
        description: 'Partial update. `code` uniqueness is validated.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ProgramIdSchema,
        body: ProgramUpdateSchema,
        response: { 200: ProgramResponseSchema },
      },
    },
    bindHandler(controller.update.bind(controller))
  )

  // DELETE /programs/:id (soft delete)
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Deactivate program keahlian',
        description: 'Soft deletes a program by setting is_active = false.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ProgramIdSchema,
        response: { 204: z.object({ message: z.string() }) },
      },
    },
    bindHandler(controller.delete.bind(controller))
  )

  // ==================== SPECIALIZATIONS ====================

  // GET /programs/:programId/specializations
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:programId/specializations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'List specializations for a program',
        description: 'Returns all specializations for a program keahlian.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ProgramParamSchema,
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().default(50),
          search: z.string().optional().default(''),
          is_active: z.coerce.boolean().optional(),
        }),
        response: { 200: PaginatedSpecializationsResponseSchema },
      },
    },
    bindHandler(controller.listSpecializations.bind(controller))
  )

  // POST /programs/:programId/specializations
  app.withTypeProvider<ZodTypeProvider>().post(
    '/:programId/specializations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Create specialization',
        description: 'Creates a specialization under a program keahlian.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: ProgramParamSchema,
        body: SpecializationCreateSchema,
        response: { 201: SpecializationResponseSchema },
      },
    },
    bindHandler(controller.createSpecialization.bind(controller))
  )

  // GET /programs/specializations/:id
  app.withTypeProvider<ZodTypeProvider>().get(
    '/specializations/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Get specialization by ID',
        description: 'Returns details for one specialization.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SpecializationParamSchema,
        response: { 200: SpecializationResponseSchema },
      },
    },
    bindHandler(controller.getSpecializationById.bind(controller))
  )

  // PATCH /programs/specializations/:id
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/specializations/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Update specialization',
        description: 'Partial update for a specialization.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SpecializationParamSchema,
        body: SpecializationUpdateSchema,
        response: { 200: SpecializationResponseSchema },
      },
    },
    bindHandler(controller.updateSpecialization.bind(controller))
  )

  // DELETE /programs/specializations/:id
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/specializations/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['jurusan'],
        summary: 'Deactivate specialization',
        description: 'Soft deletes a specialization.',
        security: [{ bearerAuth: [] }],
        headers: ContextHeadersSchema,
        params: SpecializationParamSchema,
        response: { 204: z.object({ message: z.string() }) },
      },
    },
    bindHandler(controller.deleteSpecialization.bind(controller))
  )
}
