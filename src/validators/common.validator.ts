import { z } from 'zod'

/**
 * Shared response schemas — used across all endpoints.
 * Standardizes API response format for Swagger/OpenAPI docs.
 */

// ---------- Error response ----------
export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// ---------- Success envelope (single item) ----------
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
  })
export type SuccessResponse<T> = { data: T }

// ---------- Paginated envelope ----------
export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
})
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    pagination: PaginationMetaSchema,
  })
export type PaginatedResponse<T> = { data: T[]; pagination: PaginationMeta }

// ---------- Common scalars ----------
export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
export type IdParam = z.infer<typeof IdParamSchema>

// ---------- Pagination query ----------
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

// ---------- Context headers ----------
// Multi-tenant headers used to scope requests to a school and academic year.
// Priority: header > JWT payload > null.
export const ContextHeadersSchema = z.object({
  'x-school-id': z.coerce.number().int().positive().optional()
    .describe('Active school context for multi-tenant requests'),
  'x-academic-year-id': z.coerce.number().int().positive().optional()
    .describe('Active academic year context for multi-tenant requests'),
})
export type ContextHeaders = z.infer<typeof ContextHeadersSchema>

// ---------- Reusable OpenAPI example payloads ----------
export const ExampleLoginPayload = {
  email: 'admin@zekolah.id',
  password: 'Password123',
}

export const ExampleRegisterPayload = {
  email: 'newuser@zekolah.id',
  password: 'Password123',
  name: 'New User',
}

export const ExampleTokenResponse = {
  user: {
    id: 1,
    email: 'admin@zekolah.id',
    name: 'Admin User',
    status: 'active',
    created_at: '2026-01-15T08:30:00.000Z',
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
}

export const ExampleErrorResponse = {
  statusCode: 400,
  error: 'Bad Request',
  message: 'Validation failed',
  details: [{ path: 'email', message: 'Invalid email format' }],
}

export const ExamplePaginatedResponse = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0 },
}