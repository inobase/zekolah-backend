// =====================================================
// Migration: Create programs table
// Global lookup for SMK/MAK program keahlian (jurusan).
// Managed by Super Admin.
// =====================================================

import { Knex } from 'knex';

const PROGRAM_SEEDS = [
  // SMK - Teknik Kendaraan Roda Berat
  { code: 'TKR', name: 'Teknik Kendaraan Roda Berat', education_level: '3B', description: 'Program keahlian teknik kendaraan roda berat' },
  // SMK - Teknik Sepeda Motor
  { code: 'TSM', name: 'Teknik Sepeda Motor', education_level: '3B', description: 'Program keahlian teknik sepeda motor' },
  // SMK - Teknik Instalasi Tenaga Listrik
  { code: 'TITL', name: 'Teknik Instalasi Tenaga Listrik', education_level: '3B', description: 'Program keahlian teknik instalasi tenaga listrik' },
  // SMK - Teknik Bisnis Sepeda Motor
  { code: 'TBC', name: 'Teknik Bisnis Sepeda Motor', education_level: '3B', description: 'Program keahlian bisnis sepeda motor' },
  // SMK - Aquakultur
  { code: 'AM', name: 'Aquakultur', education_level: '3B', description: 'Program keahlian aquakultur' },
  // MAK - Teknik Pengolahan Hasil Perikanan
  { code: 'TPHP', name: 'Teknik Pengolahan Hasil Perikanan', education_level: '5A', description: 'Program keahlian teknik pengolahan hasil perikanan' },
  // MAK - Teknik dan Bisnis Sepeda Motor
  { code: 'TBSM', name: 'Teknik dan Bisnis Sepeda Motor', education_level: '5A', description: 'Program keahlian teknik dan bisnis sepeda motor' },
  // MAK - Akuntansi
  { code: 'AK', name: 'Akuntansi', education_level: '5A', description: 'Program keahlian akuntansi' },
  // MAK - Administrasi Perkantoran
  { code: 'AP', name: 'Administrasi Perkantoran', education_level: '5A', description: 'Program keahlian administrasi perkantoran' },
  // MAK - Tata Boga
  { code: 'TB', name: 'Tata Boga', education_level: '5A', description: 'Program keahlian tata boga' },
];

export async function up(knex: Knex): Promise<void> {
  // Create programs table
  await knex.schema.createTable('programs', (table) => {
    table.increments('id').primary();
    table.string('code', 50).unique().notNullable();
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table
      .enu('education_level', ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '5B'], {
        useSpecificColors: false,
      })
      .notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(false, true);
  });

  // Create index for faster lookups
  await knex.schema.table('programs', (table) => {
    table.index('education_level');
    table.index('is_active');
  });

  // Seed programs
  for (const p of PROGRAM_SEEDS) {
    await knex('programs').insert(p);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('programs');
}
