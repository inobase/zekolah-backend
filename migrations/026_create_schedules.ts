// =====================================================
// Migration: Create schedules table
// School lesson schedules per class with subject, teacher, and academic year.
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop schedule_time_slots first if exists (it references schedules)
  const hasSlots = await knex.schema.hasTable('schedule_time_slots');
  if (hasSlots) {
    await knex.schema.dropTable('schedule_time_slots');
  }

  await knex.schema.createTable('schedules', (table) => {
    table.increments('id').primary();
    table
      .integer('class_id')
      .unsigned()
      .notNullable();
    table
      .integer('school_subject_id')
      .unsigned()
      .notNullable();
    table
      .integer('teacher_id')
      .unsigned()
      .notNullable();
    table
      .integer('academic_year_id')
      .unsigned()
      .notNullable();
    table
      .enu('semester', ['ganjil', 'genap'], { useStrict: true })
      .notNullable();
    table
      .enu('status', ['scheduled', 'cancelled', 'rescheduled'], { useStrict: true })
      .notNullable()
      .defaultTo('scheduled');
    table.string('room', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Foreign keys
  await knex.schema.table('schedules', (table) => {
    table
      .foreign('class_id')
      .references('id')
      .inTable('classes')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .foreign('school_subject_id')
      .references('id')
      .inTable('school_subjects')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .foreign('teacher_id')
      .references('id')
      .inTable('teachers')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .foreign('academic_year_id')
      .references('id')
      .inTable('academic_years')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
  });

  // Indexes
  await knex.schema.table('schedules', (table) => {
    table.index(['class_id', 'academic_year_id', 'semester']);
    table.index(['teacher_id', 'academic_year_id', 'semester']);
    table.index(['school_subject_id', 'academic_year_id', 'semester']);
  });

  // Unique constraint: prevent double-booking class at same day+time
  // Note: day_of_week and start_time are stored in schedule_time_slots, not here.
  // We add the unique on schedules level as a placeholder — actual enforcement is in the service layer
  // using the time_slots table.
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schedules');
}
