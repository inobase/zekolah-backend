const path = require('path');
const ADMIN_PASSWORD = require('bcryptjs').hashSync('Admin@12345', 10);

exports.seed = async function (knex) {
  // Clear tables (order matters due to FKs)
  await knex('users').del();
  
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
