const path = require('path');
const ADMIN_PASSWORD = require('bcryptjs').hashSync('Admin@12345', 10);

exports.seed = async function (knex) {
  // Clear tables (children-first to respect FK constraints)
  const tables = [
    'submissions', 'assignments', 'grades', 'attendance',
    'teaching_assignments', 'class_students', 'teachers', 'students',
    'subjects', 'classes', 'academic_years', 'schools', 'refresh_tokens',
    'users',
  ];
  for (const table of tables) {
    try {
      await knex(table).del();
    } catch {
      // ignore tables that don't exist yet
    }
  }
  
  // Insert admin user
  await knex('users').insert({
    email: 'admin@zekolah.id',
    password: ADMIN_PASSWORD,
    name: 'Administrator',
    role: 'admin',
    status: 'active',
  });

  // Insert sample teacher
  await knex('users').insert({
    email: 'teacher@zekolah.id',
    password: ADMIN_PASSWORD,
    name: 'John Doe',
    role: 'teacher',
    status: 'active',
  });

  // Insert sample student
  await knex('users').insert({
    email: 'student@zekolah.id',
    password: ADMIN_PASSWORD,
    name: 'Jane Smith',
    role: 'student',
    status: 'active',
  });
};
