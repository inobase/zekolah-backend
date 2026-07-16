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
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  validatorCompiler,
  serializerCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import path from 'path';

import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { apiRoutes } from './routes';
import { getKnex } from './config/database';
import { RoleRepository } from './repositories/role.repository';
import { UserRoleRepository } from './repositories/userRole.repository';
import { RoleResolver } from './utils/roleResolver';
import { ResolvedUserRole } from './models/interfaces/RoleInterfaces';

// Declare JWT user type and authenticate decorator on Fastify
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: number;
      email: string;
      name?: string;
      school_id?: number | null;
      academic_year_id?: number | null;
      // Resolved at auth time by app.authenticate (not from JWT payload):
      roles?: ResolvedUserRole[];
      activeSchoolId?: number | null;
      activeAcademicYearId?: number | null;
    };
  }
}

// Augmented Fastify request — adds resolved roles + active context
declare module 'fastify' {
  interface FastifyRequest {
    resolvedRoles?: ResolvedUserRole[];
    activeSchoolId?: number | null;
    activeAcademicYearId?: number | null;
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

  // Swagger / OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Zekolah Backend API',
        description: 'Educational Management System — API documentation',
        version: '1.0.5',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'users', description: 'User management' },
        { name: 'schools', description: 'School management' },
        { name: 'students', description: 'Student management' },
        { name: 'teachers', description: 'Teacher management' },
        { name: 'classes', description: 'Class management' },
        { name: 'subjects', description: 'Subject management' },
        { name: 'academic-years', description: 'Academic year management' },
        { name: 'attendances', description: 'Attendance tracking' },
        { name: 'assignments', description: 'Assignment management' },
        { name: 'submissions', description: 'Submission management' },
        { name: 'grades', description: 'Grade management' },
        { name: 'teaching-assignments', description: 'Teaching assignment management' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Zod compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // JWT auth helper for routes — verifies token, resolves roles, injects req.user
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (_err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }

    // Determine active school/year context
    // Priority: header > JWT payload > null
    const headers = (request.headers as Record<string, string | undefined>);
    const schoolId = headers?.['x-school-id']
      ? parseInt(headers['x-school-id'], 10)
      : undefined;
    const academicYearId = headers?.['x-academic-year-id']
      ? parseInt(headers['x-academic-year-id'], 10)
      : undefined;

    const ctxSchoolId = (schoolId ?? request.user.school_id ?? null) as number | null;
    const ctxAYId = (academicYearId ?? request.user.academic_year_id ?? null) as number | null;

    // Resolve roles (cached RoleResolver per request via singleton)
    const knex = getKnex();
    const roleResolver = new RoleResolver(new RoleRepository(knex), new UserRoleRepository(knex));
    const resolvedRoles = await roleResolver.resolve(request.user.id, ctxSchoolId, ctxAYId);

    // Augment request for downstream handlers
    request.resolvedRoles = resolvedRoles;
    request.activeSchoolId = ctxSchoolId;
    request.activeAcademicYearId = ctxAYId;

    // Augment user on the JWT-decoded object
    request.user.roles = resolvedRoles;
    request.user.activeSchoolId = ctxSchoolId;
    request.user.activeAcademicYearId = ctxAYId;
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