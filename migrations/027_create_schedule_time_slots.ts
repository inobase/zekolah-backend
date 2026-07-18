// =====================================================
// Migration: Create schedule_time_slots table
// Detailed daily/time/room/teacher breakdown for each schedule.
// =====================================================

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schedule_time_slots', (table) => {
    table.increments('id').primary();
    table
      .integer('schedule_id')
      .unsigned()
      .notNullable();
    table
      .enu('day_of_week', ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'], { useStrict: true })
      .notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.string('room', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Foreign key — CASCADE DELETE: removing a schedule removes its slots
  await knex.schema.table('schedule_time_slots', (table) => {
    table
      .foreign('schedule_id')
      .references('id')
      .inTable('schedules')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
  });

  // Index for fast lookup by schedule + day
  await knex.schema.table('schedule_time_slots', (table) => {
    table.index(['schedule_id', 'day_of_week']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('schedule_time_slots');
}
