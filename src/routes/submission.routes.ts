// =====================================================
// Submission Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const submissionRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /submissions - List submissions (paginated)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { page = '1', limit = '20', assignment_id, student_id } = request.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = knex('submissions')
      .join('assignments', 'submissions.assignment_id', 'assignments.id')
      .join('students', 'submissions.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .select(
        'submissions.*',
        'assignments.title as assignment_title',
        'students.nis',
        'users.name as student_name'
      );

    if (assignment_id) query = query.where('submissions.assignment_id', assignment_id);
    if (student_id) query = query.where('submissions.student_id', student_id);

    const total = await query.clone().count('* as count').first();
    const rows = await query.orderBy('submissions.submitted_at', 'desc').limit(parseInt(limit)).offset(offset);

    return {
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total?.count as string ?? '0') },
    };
  });

  // GET /submissions/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const row = await knex('submissions')
      .join('assignments', 'submissions.assignment_id', 'assignments.id')
      .join('students', 'submissions.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .where('submissions.id', id)
      .select(
        'submissions.*',
        'assignments.title as assignment_title',
        'users.name as student_name',
        'students.nis'
      )
      .first();
    if (!row) return reply.status(404).send({ message: 'Submission not found' });
    return row;
  });

  // POST /submissions
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;

    const required = ['assignment_id', 'student_id'];
    for (const field of required) {
      if (!body[field]) {
        return reply.status(400).send({ message: `${field} is required` });
      }
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [id] = await knex('submissions').insert({
      assignment_id: body.assignment_id,
      student_id: body.student_id,
      attachments: body.attachments ?? null,
      comments: body.comments ?? null,
      submitted_at: now,
      status: 'submitted',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const row = await knex('submissions').where({ id }).first();
    return reply.status(201).send(row);
  });

  // PATCH /submissions/:id - Teacher can grade
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;

    const allowed = ['score', 'comments', 'status'];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    // If score is set, mark as graded
    if (updates.score !== undefined) {
      updates.graded_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      updates.status = 'graded';
    }

    await knex('submissions').where({ id }).update({ ...updates, updated_at: new Date() });
    const row = await knex('submissions').where({ id }).first();
    return row;
  });

  // DELETE /submissions/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('submissions').where({ id }).del();
    return { message: 'Submission deleted' };
  });
};
