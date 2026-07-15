// =====================================================
// Teaching Assignment Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const teachingAssignmentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /teaching-assignments - List teaching assignments (paginated)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { page = '1', limit = '20', teacher_id, class_id, subject_id } = request.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = knex('teaching_assignments')
      .join('teachers', 'teaching_assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .join('classes', 'teaching_assignments.class_id', 'classes.id')
      .join('subjects', 'teaching_assignments.subject_id', 'subjects.id')
      .join('academic_years', 'teaching_assignments.academic_year_id', 'academic_years.id')
      .select(
        'teaching_assignments.*',
        'users.name as teacher_name',
        'teachers.specialization',
        'classes.name as class_name',
        'classes.grade',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'academic_years.year as academic_year_label'
      );

    if (teacher_id) query = query.where('teaching_assignments.teacher_id', teacher_id);
    if (class_id) query = query.where('teaching_assignments.class_id', class_id);
    if (subject_id) query = query.where('teaching_assignments.subject_id', subject_id);

    const total = await query.clone().count('* as count').first();
    const rows = await query.limit(parseInt(limit)).offset(offset);

    return {
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total?.count as string ?? '0') },
    };
  });

  // GET /teaching-assignments/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const row = await knex('teaching_assignments')
      .join('teachers', 'teaching_assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .join('classes', 'teaching_assignments.class_id', 'classes.id')
      .join('subjects', 'teaching_assignments.subject_id', 'subjects.id')
      .where('teaching_assignments.id', id)
      .select(
        'teaching_assignments.*',
        'users.name as teacher_name',
        'teachers.specialization',
        'classes.name as class_name',
        'classes.grade',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      )
      .first();
    if (!row) return reply.status(404).send({ message: 'Teaching assignment not found' });
    return row;
  });

  // POST /teaching-assignments
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;

    const required = ['teacher_id', 'class_id', 'subject_id', 'academic_year_id'];
    for (const field of required) {
      if (!body[field]) {
        return reply.status(400).send({ message: `${field} is required` });
      }
    }

    const [id] = await knex('teaching_assignments').insert({
      teacher_id: body.teacher_id,
      class_id: body.class_id,
      subject_id: body.subject_id,
      academic_year_id: body.academic_year_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const row = await knex('teaching_assignments').where({ id }).first();
    return reply.status(201).send(row);
  });

  // PATCH /teaching-assignments/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;

    const allowed = ['teacher_id', 'class_id', 'subject_id', 'academic_year_id'];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    await knex('teaching_assignments').where({ id }).update({ ...updates, updated_at: new Date() });
    const row = await knex('teaching_assignments').where({ id }).first();
    return row;
  });

  // DELETE /teaching-assignments/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('teaching_assignments').where({ id }).del();
    return { message: 'Teaching assignment deleted' };
  });
};
