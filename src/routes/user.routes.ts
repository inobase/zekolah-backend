// =====================================================
// User Routes
// =====================================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /users - List all users
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const users = await knex('users').select('id', 'email', 'name', 'role', 'status', 'created_at');
    return users;
  });

  // GET /users/:id - Get user by ID
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    const user = await knex('users').where({ id }).first();
    if (!user) return reply.status(404).send({ message: 'User not found' });
    const { password: _, ...safe } = user;
    return safe;
  });

  // PATCH /users/:id - Update user
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;

    const allowedFields = ['name', 'email', 'phone', 'avatar_url', 'address'];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field]) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    await knex('users').where({ id }).update({ ...updates, updated_at: new Date() });
    const user = await knex('users').where({ id }).first();
    const { password: _, ...safe } = user;
    return safe;
  });

  // DELETE /users/:id - Deactivate user
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    await knex('users').where({ id }).update({ status: 'inactive', updated_at: new Date() });
    return { message: 'User deactivated' };
  });
};
