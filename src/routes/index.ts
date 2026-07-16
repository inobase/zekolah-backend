// =====================================================
// API Routes
// =====================================================

import { FastifyZodInstance } from '../types/fastify-zod';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { schoolRoutes } from './school.routes';
import { studentRoutes } from './student.routes';
import { teacherRoutes } from './teacher.routes';
import { classRoutes } from './class.routes';
import { subjectRoutes } from './subject.routes';
import { academicYearRoutes } from './academic-year.routes';
import { attendanceRoutes } from './attendance.routes';
import { assignmentRoutes } from './assignment.routes';
import { submissionRoutes } from './submission.routes';
import { gradeRoutes } from './grade.routes';
import { teachingAssignmentRoutes } from './teaching-assignment.routes';

export const apiRoutes = async (app: FastifyZodInstance): Promise<void> => {
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
  await app.register(academicYearRoutes, { prefix: '/academic-years' });
  await app.register(attendanceRoutes, { prefix: '/attendances' });
  await app.register(assignmentRoutes, { prefix: '/assignments' });
  await app.register(submissionRoutes, { prefix: '/submissions' });
  await app.register(gradeRoutes, { prefix: '/grades' });
  await app.register(teachingAssignmentRoutes, { prefix: '/teaching-assignments' });
};
