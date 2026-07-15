// =====================================================
// API Routes
// =====================================================

import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { schoolRoutes } from './school.routes';
import { studentRoutes } from './student.routes';
import { teacherRoutes } from './teacher.routes';
import { classRoutes } from './class.routes';
import { subjectRoutes } from './subject.routes';

export const apiRoutes = async (app: FastifyInstance): Promise<void> => {
  // Health check
  app.get('/ping', async () => ({ pong: true }));

  // Public
  await app.register(authRoutes, { prefix: '/auth' });

  // Protected
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(schoolRoutes, { prefix: '/schools' });
  await app.register(studentRoutes, { prefix: '/students' });
  await app.register(teacherRoutes, { prefix: '/teachers' });
  await app.register(classRoutes, { prefix: '/classes' });
  await app.register(subjectRoutes, { prefix: '/subjects' });
};
