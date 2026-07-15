// =====================================================
// Teacher Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const teacherRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /teachers
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    return knex('teachers').join('users', 'teachers.user_id', 'users.id').select('*');
  });

  // GET /teachers/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const teacher = await knex('teachers').join('users', 'teachers.user_id', 'users.id').where({ 'teachers.id': id }).first();
    if (!teacher) return reply.status(404).send({ message: 'Teacher not found' });
    return teacher;
  });

  // POST /teachers
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;
    const [id] = await knex('teachers').insert({
      ...body,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return reply.status(201).send(await knex('teachers').where({ id }).first());
  });

  // PATCH /teachers/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;
    await knex('teachers').where({ id }).update({ ...body, updated_at: new Date() });
    return knex('teachers').where({ id }).first();
  });

  // DELETE /teachers/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('teachers').where({ id }).del();
    return { message: 'Teacher deleted' };
  });
};
