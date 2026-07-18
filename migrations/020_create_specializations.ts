// =====================================================
// Migration: Create specializations table
// Global lookup for SMK/MAK specialization (program keahlian).
// Managed by Super Admin. Unique per program.
// =====================================================

import { Knex } from 'knex';

const SPECIALIZATION_SEEDS = [
  // TSM — Teknik Sepeda Motor
  { program_id: 2, code: 'TSM-01', name: 'Teknik Sepeda Motor', description: 'Konsentrasi teknik sepeda motor' },
  { program_id: 2, code: 'TSM-02', name: 'Teknik Pendingin & Tata Udara', description: 'Konsentrasi teknik pendingin dan tata udara' },
  // TKR — Teknik Kendaraan Roda Berat
  { program_id: 1, code: 'TKR-01', name: 'Teknik Kendaraan Ringan', description: 'Konsentrasi teknik kendaraan ringan' },
  { program_id: 1, code: 'TKR-02', name: 'Teknik Kendaraan Berat', description: 'Konsentrasi teknik kendaraan berat' },
  { program_id: 1, code: 'TKR-03', name: 'Teknik chassis', description: 'Konsentrasi teknik chassis' },
  // TITL — Teknik Instalasi Tenaga Listrik
  { program_id: 3, code: 'TITL-01', name: 'Instalasi Listrik', description: 'Konsentrasi instalasi listrik' },
  { program_id: 3, code: 'TITL-02', name: 'Sistem Kelistrikan Tenaga', description: 'Konsentrasi sistem kelistrikan tenaga' },
  { program_id: 3, code: 'TITL-03', name: 'Autombasi Industri', description: 'Konsentrasi automisasi industri' },
  // TBC — Teknik Bisnis Sepeda Motor
  { program_id: 4, code: 'TBC-01', name: 'Bisnis Sepeda Motor', description: 'Konsentrasi bisnis sepeda motor' },
  { program_id: 4, code: 'TBC-02', name: 'Manajemen Pelayanan Bengkel', description: 'Konsentrasi manajemen pelayanan bengkel' },
  // AM — Aquakultur
  { program_id: 5, code: 'AM-01', name: 'Teknologi Budidaya Air Tawar', description: 'Konsentrasi teknologi budidaya air tawar' },
  { program_id: 5, code: 'AM-02', name: 'Teknologi Pengolahan Hasil Perikanan', description: 'Konsentrasi teknologi pengolahan hasil perikanan' },
  // TPHP — Teknik Pengolahan Hasil Perikanan (MAK)
  { program_id: 6, code: 'TPHP-01', name: 'Teknologi Pengolahan Ikan', description: 'Konsentrasi teknologi pengolahan ikan' },
  { program_id: 6, code: 'TPHP-02', name: 'Teknologi Pembuatan Produk Olahan', description: 'Konsentrasi teknologi pembuatan produk olahan' },
  // TBSM — Teknik dan Bisnis Sepeda Motor (MAK)
  { program_id: 7, code: 'TBSM-01', name: 'Perawatan dan Reparasi Sepeda Motor', description: 'Konsentrasi perawatan dan reparasi sepeda motor' },
  { program_id: 7, code: 'TBSM-02', name: 'Pengembangan Bisnis Sepeda Motor', description: 'Konsentrasi pengembangan bisnis sepeda motor' },
  // AK — Akuntansi (MAK)
  { program_id: 8, code: 'AK-01', name: 'Akuntansi Dasar', description: 'Konsentrasi akuntansi dasar' },
  { program_id: 8, code: 'AK-02', name: 'Akuntansi Komputer', description: 'Konsentrasi akuntansi komputer' },
  // AP — Administrasi Perkantoran (MAK)
  { program_id: 9, code: 'AP-01', name: 'Manajemen Informasi', description: 'Konsentrasi manajemen informasi' },
  { program_id: 9, code: 'AP-02', name: 'Tata Niaga', description: 'Konsentrasi tata niaga' },
  // TB — Tata Boga (MAK)
  { program_id: 10, code: 'TB-01', name: 'Teknik Pangan', description: 'Konsentrasi teknik pangan' },
  { program_id: 10, code: 'TB-02', name: 'Manajemen Catering', description: 'Konsentrasi manajemen catering' },
];

export async function up(knex: Knex): Promise<void> {
  // Create specializations table
  await knex.schema.createTable('specializations', (table) => {
    table.increments('id').primary();
    table
      .integer('program_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('programs')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(false, true);
  });

  // Unique index on (program_id, code) — not global unique
  await knex.schema.table('specializations', (table) => {
    table.unique(['program_id', 'code'], 'specializations_program_code_unique');
    table.index('program_id');
    table.index('is_active');
  });

  // Seed specializations
  for (const s of SPECIALIZATION_SEEDS) {
    await knex('specializations').insert(s);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('specializations');
}
