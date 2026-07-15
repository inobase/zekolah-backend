// SQLite-compatible base schema for tests.
// Mirrors migrations/001_create_base_tables.ts but:
//   - Replaces table.timestamps(true, true) with explicit dateTime columns
//     that have application-level defaults (knex.fn.now() not supported)
//   - Drops mysql2-only options
exports.up = async function (knex) {
  // Core tables (no foreign key dependencies)
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password', 255).notNullable();
    table.string('name', 200).notNullable();
    table.string('role', 50).defaultTo('student');
    table.string('phone', 20).nullable();
    table.string('avatar_url', 500).nullable();
    table.text('address').nullable();
    table.string('status', 20).defaultTo('active');
    table.dateTime('last_login').nullable();
    table.dateTime('email_verified_at').nullable();
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('schools', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('code', 50).unique().notNullable();
    table.string('email', 255).nullable();
    table.string('phone', 20).nullable();
    table.string('address').nullable();
    table.string('city', 100).nullable();
    table.string('province', 100).nullable();
    table.string('logo_url', 500).nullable();
    table.string('status', 20).defaultTo('active');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('academic_years', (table) => {
    table.increments('id').primary();
    table.integer('school_id').notNullable();
    table.string('year', 20).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('semester', 10).defaultTo('ganjil');
    table.string('status', 20).defaultTo('upcoming');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('classes', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.integer('grade').notNullable();
    table.integer('vacancy').defaultTo(40);
    table.integer('academic_year_id').notNullable();
    table.integer('school_id').notNullable();
    table.foreign('academic_year_id').references('academic_years.id');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('subjects', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('code', 50).notNullable();
    table.integer('school_id').notNullable();
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('students', (table) => {
    table.increments('id').primary();
    table.string('nis', 50).unique().notNullable();
    table.string('nisn', 50).unique().nullable();
    table.integer('user_id').notNullable().unique();
    table.date('birth_date').nullable();
    table.string('gender', 10).nullable();
    table.string('parent_name', 200).nullable();
    table.string('parent_phone', 50).nullable();
    table.string('address').nullable();
    table.integer('school_id').notNullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('teachers', (table) => {
    table.increments('id').primary();
    table.string('nip', 100).unique().nullable();
    table.integer('user_id').notNullable().unique();
    table.string('specialization', 200).nullable();
    table.string('address').nullable();
    table.string('phone', 50).nullable();
    table.integer('school_id').notNullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('class_students', (table) => {
    table.increments('id').primary();
    table.integer('class_id').notNullable();
    table.integer('student_id').notNullable();
    table.integer('academic_year_id').notNullable();
    table.foreign('class_id').references('classes.id');
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('teaching_assignments', (table) => {
    table.increments('id').primary();
    table.integer('teacher_id').notNullable();
    table.integer('class_id').notNullable();
    table.integer('subject_id').notNullable();
    table.integer('academic_year_id').notNullable();
    table.foreign('teacher_id').references('teachers.id').onDelete('CASCADE');
    table.foreign('class_id').references('classes.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('CASCADE');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('attendance', (table) => {
    table.increments('id').primary();
    table.integer('student_id').notNullable();
    table.integer('subject_id').notNullable();
    table.date('date').notNullable();
    table.string('status', 10).notNullable();
    table.string('reason').nullable();
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.index(['student_id', 'date']);
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('grades', (table) => {
    table.increments('id').primary();
    table.integer('student_id').notNullable();
    table.integer('subject_id').notNullable();
    table.integer('academic_year_id').notNullable();
    table.string('assessment_type', 100).notNullable();
    table.decimal('score', 5, 2).notNullable();
    table.string('max_score', 10).defaultTo('100');
    table.integer('teacher_id').nullable();
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('CASCADE');
    table.foreign('teacher_id').references('teachers.id').onDelete('SET NULL');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('assignments', (table) => {
    table.increments('id').primary();
    table.integer('teacher_id').notNullable();
    table.integer('class_id').notNullable();
    table.integer('subject_id').notNullable();
    table.integer('academic_year_id').notNullable();
    table.string('title', 300).notNullable();
    table.text('description').nullable();
    table.date('due_date').notNullable();
    table.decimal('max_score', 5, 2).defaultTo('100');
    table.string('attachments', 500).nullable();
    table.foreign('teacher_id').references('teachers.id').onDelete('CASCADE');
    table.foreign('class_id').references('classes.id').onDelete('CASCADE');
    table.foreign('subject_id').references('subjects.id').onDelete('CASCADE');
    table.foreign('academic_year_id').references('academic_years.id').onDelete('CASCADE');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('submissions', (table) => {
    table.increments('id').primary();
    table.integer('assignment_id').notNullable();
    table.integer('student_id').notNullable();
    table.string('attachments', 500).nullable();
    table.text('comments').nullable();
    table.decimal('score', 5, 2).nullable();
    table.date('submitted_at').nullable();
    table.date('graded_at').nullable();
    table.string('status', 20).defaultTo('pending');
    table.foreign('assignment_id').references('assignments.id').onDelete('CASCADE');
    table.foreign('student_id').references('students.id').onDelete('CASCADE');
    table.index(['assignment_id', 'student_id']);
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('token', 500).unique().notNullable();
    table.dateTime('expires_at').notNullable();
    table.string('revoked_reason', 100).nullable();
    table.dateTime('revoked_at').nullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('submissions');
  await knex.schema.dropTableIfExists('assignments');
  await knex.schema.dropTableIfExists('grades');
  await knex.schema.dropTableIfExists('attendance');
  await knex.schema.dropTableIfExists('teaching_assignments');
  await knex.schema.dropTableIfExists('class_students');
  await knex.schema.dropTableIfExists('teachers');
  await knex.schema.dropTableIfExists('students');
  await knex.schema.dropTableIfExists('subjects');
  await knex.schema.dropTableIfExists('classes');
  await knex.schema.dropTableIfExists('academic_years');
  await knex.schema.dropTableIfExists('schools');
  await knex.schema.dropTableIfExists('users');
};