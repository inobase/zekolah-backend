// =====================================================
// Attendance Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const attendanceRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /attendances - List attendance records (paginated)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { page = '1', limit = '20', student_id, subject_id, date_from, date_to } = request.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = knex('attendance')
      .join('students', 'attendance.student_id', 'students.id')
      .join('subjects', 'attendance.subject_id', 'subjects.id')
      .join('users', 'students.user_id', 'users.id')
      .select(
        'attendance.*',
        'students.nis',
        'students.nisn',
        'users.name as student_name',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      );

    if (student_id) query = query.where('attendance.student_id', student_id);
    if (subject_id) query = query.where('attendance.subject_id', subject_id);
    if (date_from) query = query.where('attendance.date', '>=', date_from);
    if (date_to) query = query.where('attendance.date', '<=', date_to);

    const total = await query.clone().count('* as count').first();
    const records = await query.orderBy('attendance.date', 'desc').limit(parseInt(limit)).offset(offset);

    return {
      data: records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total?.count as string ?? '0') },
    };
  });

  // GET /attendances/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const record = await knex('attendance')
      .join('students', 'attendance.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .where('attendance.id', id)
      .select('attendance.*', 'users.name as student_name', 'students.nis')
      .first();
    if (!record) return reply.status(404).send({ message: 'Attendance record not found' });
    return record;
  });

  // POST /attendances
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;

    const required = ['student_id', 'subject_id', 'date', 'status'];
    for (const field of required) {
      if (!body[field]) {
        return reply.status(400).send({ message: `${field} is required` });
      }
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'sick', 'permission'];
    if (!(validStatuses as readonly string[]).includes(body.status as string)) {
      return reply.status(400).send({ message: 'Invalid status. Must be: present, absent, sick, permission' });
    }

    const [id] = await knex('attendance').insert({
      student_id: body.student_id,
      subject_id: body.subject_id,
      date: body.date,
      status: body.status,
      reason: body.reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const record = await knex('attendance').where({ id }).first();
    return reply.status(201).send(record);
  });

  // PATCH /attendances/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;

    const allowed = ['status', 'reason'];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    await knex('attendance').where({ id }).update({ ...updates, updated_at: new Date() });
    const record = await knex('attendance').where({ id }).first();
    return record;
  });

  // DELETE /attendances/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('attendance').where({ id }).del();
    return { message: 'Attendance record deleted' };
  });
};
