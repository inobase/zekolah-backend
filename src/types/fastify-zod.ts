// =====================================================
// Fastify Zod Type Helpers
// Shared typed Fastify instance for routes that use
// fastify-type-provider-zod with .withTypeProvider<ZodTypeProvider>()
// =====================================================

import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'

/**
 * Use this type for route files that have been migrated to use
 * Zod schemas via .withTypeProvider<ZodTypeProvider>().
 */
export type FastifyZodInstance = FastifyInstance