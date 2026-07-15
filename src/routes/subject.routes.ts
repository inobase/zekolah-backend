// =====================================================
// Subject Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const subjectRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /subjects
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    return knex('subjects').select('*');
  });

  // GET /subjects/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const subject = await knex('subjects').where({ id }).first();
    if (!subject) return reply.status(404).send({ message: 'Subject not found' });
    return subject;
  });

  // POST /subjects
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;
    const [id] = await knex('subjects').insert({
      ...body,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return reply.status(201).send(await knex('subjects').where({ id }).first());
  });

  // PATCH /subjects/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;
    await knex('subjects').where({ id }).update({ ...body, updated_at: new Date() });
    return knex('subjects').where({ id }).first();
  });

  // DELETE /subjects/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('subjects').where({ id }).del();
    return { message: 'Subject deleted' };
  });
};
