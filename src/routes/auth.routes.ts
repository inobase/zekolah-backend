// =====================================================
// Auth Routes
// Public endpoints: login, register, refresh
// =====================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { getKnex } from '../config/database';
import { config } from '../config';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'teacher', 'student', 'parent']).default('student'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body);
    const knex = getKnex();

    const existing = await knex('users').where({ email: data.email }).first();
    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Email is already registered',
      });
    }

    const hash = await bcrypt.hash(data.password, config.bcryptRounds);
    const [id] = await knex('users').insert({
      email: data.email,
      password: hash,
      name: data.name,
      role: data.role,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const user = await knex('users').where({ id }).first();
    const { password: _, ...safe } = user;

    const token = app.jwt.sign({ id: safe.id, email: safe.email, role: safe.role });
    return reply.status(201).send({ user: safe, token });
  });

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const knex = getKnex();

    const user = await knex('users').where({ email }).first();
    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    if (user.status !== 'active') {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Account is not active',
      });
    }

    const { password: _, ...safe } = user;
    const token = app.jwt.sign({ id: safe.id, email: safe.email, role: safe.role });
    return reply.send({ user: safe, token });
  });

  // GET /auth/me
  app.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const knex = getKnex();
      const user = await knex('users').where({ id: request.user.id }).first();
      if (!user) return reply.status(404).send({ message: 'User not found' });
      const { password: _, ...safe } = user;
      return reply.send(safe);
    } catch (_err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });
};
