// =====================================================
// School Routes - Multi-school management
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export const schoolRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /schools
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    return knex('schools').select('*');
  });

  // GET /schools/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    const school = await knex('schools').where({ id }).first();
    if (!school) return reply.status(404).send({ message: 'School not found' });
    return school;
  });

  // POST /schools
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const body = request.body as Record<string, unknown>;
    const [id] = await knex('schools').insert({
      ...body,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const school = await knex('schools').where({ id }).first();
    return reply.status(201).send(school);
  });

  // PATCH /schools/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;
    await knex('schools').where({ id }).update({ ...body, updated_at: new Date() });
    const school = await knex('schools').where({ id }).first();
    return school;
  });

  // DELETE /schools/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    await knex('schools').where({ id }).del();
    return { message: 'School deleted' };
  });
};
