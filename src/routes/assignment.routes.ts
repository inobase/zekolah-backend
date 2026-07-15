// =====================================================
// Assignments Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const assignmentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /assignments - List assignments (paginated)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { page = '1', limit = '20', class_id, subject_id, teacher_id } = request.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = knex('assignments')
      .join('classes', 'assignments.class_id', 'classes.id')
      .join('subjects', 'assignments.subject_id', 'subjects.id')
      .join('teachers', 'assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .select(
        'assignments.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'classes.name as class_name',
        'users.name as teacher_name'
      );

    if (class_id) query = query.where('assignments.class_id', class_id);
    if (subject_id) query = query.where('assignments.subject_id', subject_id);
    if (teacher_id) query = query.where('assignments.teacher_id', teacher_id);

    const total = await query.clone().count('* as count').first();
    const rows = await query.orderBy('assignments.due_date', 'asc').limit(parseInt(limit)).offset(offset);

    return {
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total?.count as string ?? '0') },
    };
  });

  // GET /assignments/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const row = await knex('assignments')
      .join('subjects', 'assignments.subject_id', 'subjects.id')
      .join('classes', 'assignments.class_id', 'classes.id')
      .join('teachers', 'assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .where('assignments.id', id)
      .select(
        'assignments.*',
        'subjects.name as subject_name',
        'classes.name as class_name',
        'users.name as teacher_name'
      )
      .first();
    if (!row) return reply.status(404).send({ message: 'Assignment not found' });
    return row;
  });

  // POST /assignments
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;

    const required = ['teacher_id', 'class_id', 'subject_id', 'academic_year_id', 'title', 'due_date'];
    for (const field of required) {
      if (!body[field]) {
        return reply.status(400).send({ message: `${field} is required` });
      }
    }

    const [id] = await knex('assignments').insert({
      teacher_id: body.teacher_id,
      class_id: body.class_id,
      subject_id: body.subject_id,
      academic_year_id: body.academic_year_id,
      title: body.title,
      description: body.description ?? null,
      due_date: body.due_date,
      max_score: body.max_score ?? 100,
      attachments: body.attachments ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const row = await knex('assignments').where({ id }).first();
    return reply.status(201).send(row);
  });

  // PATCH /assignments/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;

    const allowed = ['title', 'description', 'due_date', 'max_score', 'attachments'];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    await knex('assignments').where({ id }).update({ ...updates, updated_at: new Date() });
    const row = await knex('assignments').where({ id }).first();
    return row;
  });

  // DELETE /assignments/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('assignments').where({ id }).del();
    return { message: 'Assignment deleted' };
  });
};
