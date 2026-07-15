// =====================================================
// Global Error Handler Middleware
// =====================================================

import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

interface ErrorResponse {
  statusCode: number;
  error?: string;
  message: string;
  details?: unknown;
}

export function errorHandler(this: FastifyInstance, error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  logger.error(`[${request.method} ${request.url}] ${error.message}`, { stack: error.stack });

  // Handle AppError (business / service-layer errors)
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    reply.status(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: 'Request validation failed',
      details: (error as any).details,
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'FastifyJwtAuthError') {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
    return;
  }

  // Handle Knex/Mysql errors
  if ((error as any).code === 'ER_BAD_FIELD_ERROR' || (error as any).code === 'ER_NO_SUCH_TABLE') {
    logger.warn('Schema mismatch:', error.message);
    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Error',
      message: 'Database schema issue detected',
    });
    return;
  }

  // Default error response
  const errorName = (error as any).error || 'Internal Server Error';
  reply.status(error.statusCode || 500).send({
    statusCode: error.statusCode || 500,
    error: errorName,
    message: error.message || 'An unexpected error occurred',
  });
}