// =====================================================
// Class Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const classRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /classes - List classes with academic year info
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    return knex('classes')
      .join('academic_years', 'classes.academic_year_id', 'academic_years.id')
      .join('schools', 'classes.school_id', 'schools.id')
      .select('*', 'academic_years.year as academic_year_label', 'schools.name as school_name');
  });

  // GET /classes/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const klass = await knex('classes').where({ id }).first();
    if (!klass) return reply.status(404).send({ message: 'Class not found' });
    return klass;
  });

  // POST /classes
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;
    const [id] = await knex('classes').insert({
      ...body,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return reply.status(201).send(await knex('classes').where({ id }).first());
  });

  // PATCH /classes/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;
    await knex('classes').where({ id }).update({ ...body, updated_at: new Date() });
    return knex('classes').where({ id }).first();
  });

  // DELETE /classes/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('classes').where({ id }).del();
    return { message: 'Class deleted' };
  });
};
