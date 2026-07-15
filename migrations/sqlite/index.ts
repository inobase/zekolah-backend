// =====================================================
// SQLite migration runner
// Aggregates all per-table migrations and exposes
// `up`/`down` compatible with knex programmatic API.
// =====================================================

import * as users from './001_users';
import * as schools from './002_schools';
import * as academicYears from './003_academic_years';
import * as teachers from './004_teachers';
import * as subjects from './005_subjects';
import * as classes from './006_classes';
import * as students from './007_students';
import * as classStudents from './008_class_students';
import * as teachingAssignments from './009_teaching_assignments';
import * as attendance from './010_attendance';
import * as grades from './011_grades';
import * as assignments from './012_assignments';
import * as submissions from './013_submissions';
import * as refreshTokens from './014_refresh_tokens';

export const up = async (knex: import('knex').Knex): Promise<void> => {
  await users.up(knex);
  await schools.up(knex);
  await academicYears.up(knex);
  await teachers.up(knex);
  await subjects.up(knex);
  await classes.up(knex);
  await students.up(knex);
  await classStudents.up(knex);
  await teachingAssignments.up(knex);
  await attendance.up(knex);
  await grades.up(knex);
  await assignments.up(knex);
  await submissions.up(knex);
  await refreshTokens.up(knex);
};

export const down = async (knex: import('knex').Knex): Promise<void> => {
  await refreshTokens.down(knex);
  await submissions.down(knex);
  await assignments.down(knex);
  await grades.down(knex);
  await attendance.down(knex);
  await teachingAssignments.down(knex);
  await classStudents.down(knex);
  await students.down(knex);
  await classes.down(knex);
  await subjects.down(knex);
  await teachers.down(knex);
  await academicYears.down(knex);
  await schools.down(knex);
  await users.down(knex);
};