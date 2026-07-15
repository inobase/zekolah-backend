// =====================================================
// Student Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export const studentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /students - List students (paginated)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { page = '1', limit = '20', search, class_id } = request.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = knex('students').join('users', 'students.user_id', 'users.id');
    if (search) {
      query = query.where((qb: any) => {
        qb.whereLike('users.name', `%${search}%`);
      }).andWhereLike('students.nis', `%${search}%`);
    }
    if (class_id) {
      query = query.where({ class_id });
    }

    const total = await query.clone().count('* as count').first();
    const students = await query.limit(parseInt(limit)).offset(offset);
    
    return { data: students, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total.count as string) } };
  });

  // GET /students/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    const student = await knex('students').join('users', 'students.user_id', 'users.id').where({ 'students.id': id }).first();
    if (!student) return reply.status(404).send({ message: 'Student not found' });
    return student;
  });

  // POST /students
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const body = request.body as Record<string, unknown>;
    const [id] = await knex('students').insert({
      ...body,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const student = await knex('students').where({ id }).first();
    return reply.status(201).send(student);
  });

  // PATCH /students/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;
    await knex('students').where({ id }).update({ ...body, updated_at: new Date() });
    const student = await knex('students').where({ id }).first();
    return student;
  });

  // DELETE /students/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = require('@/config/database').getKnex();
    const { id } = request.params as { id: number };
    await knex('students').where({ id }).del();
    return { message: 'Student deleted' };
  });
};
