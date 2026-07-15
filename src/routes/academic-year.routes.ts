// =====================================================
// Academic Year Routes
// =====================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getKnex } from '../config/database';

export const academicYearRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRequest', app.authenticate);

  // GET /academic-years - List academic years for a school (paginated)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { page = '1', limit = '20', school_id } = request.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = knex('academic_years')
      .join('schools', 'academic_years.school_id', 'schools.id')
      .select('academic_years.*', 'schools.name as school_name');

    if (school_id) {
      query = query.where('academic_years.school_id', school_id);
    }

    const total = await query.clone().count('* as count').first();
    const rows = await query.limit(parseInt(limit)).offset(offset);

    return {
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total?.count as string ?? '0') },
    };
  });

  // GET /academic-years/:id
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const row = await knex('academic_years')
      .join('schools', 'academic_years.school_id', 'schools.id')
      .where('academic_years.id', id)
      .select('academic_years.*', 'schools.name as school_name')
      .first();
    if (!row) return reply.status(404).send({ message: 'Academic year not found' });
    return row;
  });

  // POST /academic-years
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const body = request.body as Record<string, unknown>;

    // Validate required fields
    const required = ['school_id', 'year', 'start_date', 'end_date'];
    for (const field of required) {
      if (!body[field]) {
        return reply.status(400).send({ message: `${field} is required` });
      }
    }

    const [id] = await knex('academic_years').insert({
      school_id: body.school_id,
      year: body.year,
      start_date: body.start_date,
      end_date: body.end_date,
      semester: body.semester ?? 'ganjil',
      status: body.status ?? 'upcoming',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const row = await knex('academic_years').where({ id }).first();
    return reply.status(201).send(row);
  });

  // PATCH /academic-years/:id
  app.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    const body = request.body as Record<string, unknown>;

    const allowed = ['year', 'start_date', 'end_date', 'semester', 'status'];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    await knex('academic_years').where({ id }).update({ ...updates, updated_at: new Date() });
    const row = await knex('academic_years').where({ id }).first();
    return row;
  });

  // DELETE /academic-years/:id
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const knex = getKnex();
    const { id } = request.params as { id: number };
    await knex('academic_years').where({ id }).del();
    return { message: 'Academic year deleted' };
  });
};
