// =====================================================
// Migration: Create students table (MySQL)
// Dependencies: users, classes, schools
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('students', (table) => {
    table.increments('id').primary();
    table.string('nis', 50).unique().notNullable();
    table.string('nisn', 50).unique().nullable();
    table.integer('user_id').unsigned().notNullable().unique();
    table.date('date_of_birth').nullable();
    table.string('gender', 10).nullable();
    table.string('parent_name', 200).nullable();
    table.string('parent_phone', 50).nullable();
    table.string('phone', 50).nullable();
    table.string('address').nullable();
    table.integer('class_id').unsigned().nullable();
    table.integer('school_id').unsigned().notNullable();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('class_id').references('classes.id');
    table.foreign('school_id').references('schools.id');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('students');
}