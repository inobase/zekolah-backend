// =====================================================
// Migration: Create students table
// Dependencies: users, classes, schools
// =====================================================

exports.up = async function (knex) {
  await knex.schema.createTable('students', (table) => {
    table.increments('id').primary();
    table.string('nis', 50).unique().notNullable();
    table.string('nisn', 50).unique().nullable();
    table.integer('user_id').notNullable().unique();
    table.date('date_of_birth').nullable();
    table.string('gender', 10).nullable();
    table.string('parent_name', 200).nullable();
    table.string('parent_phone', 50).nullable();
    table.string('phone', 50).nullable();
    table.string('address').nullable();
    table.integer('class_id').nullable();
    table.integer('school_id').notNullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('class_id').references('classes.id');
    table.foreign('school_id').references('schools.id');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('students');
};