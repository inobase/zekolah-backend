// =====================================================
// Fastify Application Factory
// Used by both the runtime entrypoint and integration tests.
// =====================================================

import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';

import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { apiRoutes } from './routes';

// Declare JWT user type and authenticate decorator on Fastify
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: number;
      email: string;
      role?: string;
      name?: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const buildApp = async (overrides?: {
  logger?: boolean;
}): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: overrides?.logger ?? false,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: config.isProd,
  });

  // CORS
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // JWT
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  // Multipart (file uploads)
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });

  // Static files
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/',
  });

  // JWT auth helper for routes
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (_err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });

  // Global error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'zekolah-backend',
    version: '1.0.0',
  }));

  // API routes
  await app.register(apiRoutes, { prefix: '/api/v1' });

  return app;
};