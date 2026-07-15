// =====================================================
// Grade Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const gradeRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /grades - List grades (paginated)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { page = '1', limit = '20', student_id, subject_id, assessment_type } = request.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = knex('grades')
      .join('students', 'grades.student_id', 'students.id')
      .join('subjects', 'grades.subject_id', 'subjects.id')
      .join('users', 'students.user_id', 'users.id')
      .select(
        'grades.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'users.name as student_name',
        'students.nis'
      );

    if (student_id) query = query.where('grades.student_id', student_id);
    if (subject_id) query = query.where('grades.subject_id', subject_id);
    if (assessment_type) query = query.where('grades.assessment_type', assessment_type);

    const total = await query.clone().count('* as count').first();
    const rows = await query.limit(parseInt(limit)).offset(offset);

    return {
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total?.count as string ?? '0') },
    };
  });

  // GET /grades/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const row = await knex('grades')
      .join('students', 'grades.student_id', 'students.id')
      .join('subjects', 'grades.subject_id', 'subjects.id')
      .join('users', 'students.user_id', 'users.id')
      .where('grades.id', id)
      .select(
        'grades.*',
        'subjects.name as subject_name',
        'users.name as student_name',
        'students.nis'
      )
      .first();
    if (!row) return reply.status(404).send({ message: 'Grade not found' });
    return row;
  });

  // POST /grades
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;

    const required = ['student_id', 'subject_id', 'academic_year_id', 'assessment_type', 'score'];
    for (const field of required) {
      if (!body[field]) {
        return reply.status(400).send({ message: `${field} is required` });
      }
    }

    const [id] = await knex('grades').insert({
      student_id: body.student_id,
      subject_id: body.subject_id,
      academic_year_id: body.academic_year_id,
      assessment_type: body.assessment_type,
      score: body.score,
      max_score: body.max_score ?? '100',
      teacher_id: body.teacher_id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const row = await knex('grades').where({ id }).first();
    return reply.status(201).send(row);
  });

  // PATCH /grades/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;

    const allowed = ['score', 'max_score', 'assessment_type'];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    await knex('grades').where({ id }).update({ ...updates, updated_at: new Date() });
    const row = await knex('grades').where({ id }).first();
    return row;
  });

  // DELETE /grades/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('grades').where({ id }).del();
    return { message: 'Grade deleted' };
  });
};
