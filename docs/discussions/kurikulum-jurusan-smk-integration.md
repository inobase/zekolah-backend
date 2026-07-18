# Diskusi: Integrasi Dukungan Jurusan SMK & Kurikulum Merdeka

**Tanggal:** 2026-07-18  
**Status:** Desain Awal

---

## 1. Ringkasan Keputusan Utama

| # | Topik | Keputusan |
|---|-------|-----------|
| 1 | Skala perubahan | **Big-bang design** — langsung implementasi penuh, bukan incremental. Database siap di-reset karena belum rilis. |
| 2 | Jenis kurikulum | **Kurikulum Merdeka saja** — tidak perlu support Kurikulum 2013 (Bidang Keahlian) untuk sekarang. |
| 3 | Jenis sekolah | **SMK saja** — tidak perlu support SMA (SMA tidak butuh jurusan). |
| 4 | Jenjang pendidikan | **Field `education_level` di tabel `schools`** — membedakan SMK (1A/1B), SMP (2A/2B), SD (3A/3B), SLB (4A/4B), MKI (5A/5B), MAK (6A/6B) sesuai Permendikbud. |
| 5 | Hierarki jurusan | **Ya**, hierarki: `Sekolah → Program Keahlian → Kompetensi Keahlian → Mata Pelajaran`. |
| 6 | Jadwal | **Tabel `schedules` terpisah** — tidak menggunakan `classes` yang sudah ada sebagai container jadwal. |
| 7 | Kurikulum ownership | **Sekolah自主选择** — Super Admin menyediakan template `kurikulum_struktur`, sekolah secara mandiri memilih/mengaktifkan. Bukan push otomatis. |
| 8 | Fitur prioritas | **(b) Mapping kurikulum + (c) Keduanya sekaligus** — struktur jurusan dan mapping kurikulum diimplementasi bersamaan. |

---

## 2. Struktur Hierarki Jurusan

### 2.1 Tingkatan

```
Sekolah
 └── Program Keahlian (PROJ)
      └── Kompetensi Keahlian (SPR)
           └── Mata Pelajaran (Mapel Umum + Mapel Produktif)
                ├── Mapel Umum (nasional, sama untuk semua SMK)
                ├── Mapel Dasar Kejuruan (DD)
                └── Mapel Produktif Spesifik (SPR)
```

### 2.2 Perbedaan dengan `subjects` Existing

| Aspek | `subjects` Existing | `jurusan` Structure (BARU) |
|-------|---------------------|---------------------------|
| Owner | Super Admin (global) | Sekolah (scoped per sekolah) |
| Purpose | Mata pelajaran umum CRUD | Struktur kurikulum jurusan SMK |
| Tipe Mapel | Tidak dibedakan | Umum vs Dasar Kejuruan vs Produktif |
| Scope | Cross-school | School-specific |
| Template | - | Super Admin menyediakan template kurikulum per program/kompetensi |

### 2.4 Jenjang Pendidikan (`schools.education_level`)

Field `education_level` di tabel `schools` membedakan jenjang pendidikan sesuai klasifikasi Kemendikbud:

| Code | Jenjang | Keterangan |
|------|---------|------------|
| `1A` | SD/MI | Sekolah Dasar / Madrasah Ibtidaiyah |
| `1B` | SDLB | Sekolah Dasar Luar Biasa |
| `2A` | SMP/MTs | Sekolah Menengah Pertama / Madrasah Tsanawiyah |
| `2B` | SMPLB | Sekolah Menengah Pertama Luar Biasa |
| `3A` | SMA/MA | Sekolah Menengah Atas / Madrasah Aliyah |
| `3B` | SMK/MAK | Sekolah Menengah Kejuruan / Madrasah Aliyah Kejuruan |
| `4A` | SMALB | Sekolah Menengah Atas Luar Biasa |
| `5A` | MKI | Madrasah Kinayah / Institut Keagamaan (Pendidikan Tinggi) |
| `5B` | MKP | Madrasah Muallimin Muallimat / Perguruan Tinggi Keagamaan |

**Implementasi:**
- Field `education_level` bertipe `ENUM('1A','1B','2A','2B','3A','3B','4A','5A','5B')` di tabel `schools`
- Kurikulum struktur (programs/specializations) hanya valid untuk `education_level IN ('3B','5A','5B')` (SMK/MAK dan Pendidikan Tinggi)
- SMA/SD/MAN tidak menampilkan menu Jurusan karena tidak relevan

---

## 2.3 Tabel yang Dibutuhkan

Tabel `subjects` yang sudah ada merupakan tabel **nasional/global** yang dikelola Super Admin. Untuk kebutuhan jurusan SMK, diperlukan tabel baru:

| Tabel Baru | Tujuan |
|-----------|--------|
| `programs` | Program Keahlian (mis: Teknik Kendaraan Roda 2 - TKR) |
| `specializations` | Kompetensi Keahlian (mis: Teknik Sepeda Motor - TSM) |
| `school_programs` | Link sekolah × program (sekolah menawarkan program apa) |
| `school_specializations` | Link sekolah × program × spesialisasi |
| `school_subjects` | Mata pelajaran scoped per sekolah (template dari Super Admin, diadopsi sekolah) |
| `kurikulum_structures` | Struktur kurikulum per sekolah (mapping mapel ke semester, tipe, JP) |
| `schedules` | Jadwal pelajaran per kelas per semester |

**Catatan:** `school_subjects` berbeda dari `subjects`:
- `subjects` → master data nasional (Super Admin manage)
- `school_subjects` → kurikulum sekolah (sekolah adopt dari template, bisa modifikasi)

---

## 3. Template Kurikulum

### 3.1 Alur Aktivasi Kurikulum

```
Super Admin
  │
  ├─ Membuat template kurikulum_struktur
  │     └─ programs (daftar program keahlian nasional)
  │     └─ specializations (daftar kompetensi keahlian per program)
  │     └─ school_subjects templates (mapping mapel persemester)
  │
  ▼
Sekolah (Admin)
  │
  ├─ Browse template kurikulum yang tersedia
  │
  ├─ Pilih & aktifkan template
  │
  ▼
Sekolah Aktif
  │
  ├─ Kurikulum ter-copy ke sekolah tersebut
  │     └─ school_programs (link sekolah ↔ program)
  │     └─ school_specializations (link sekolah ↔ spesialisasi)
  │     └─ school_subjects (mapel adopted dari template)
  │     └─ kurikulum_structures (mapping semester ↔ mapel ↔ JP)
  │
  └─ Admin sekolah bisa modifikasi (nama mapel, jumlah JP, dll)
```

### 3.2 Template Data

Template kurikulum oleh Super Admin berisi:
- Daftar **Program Keahlian** (mis: TKR, TSM, TITL, TBC, dll)
- Daftar **Kompetensi Keahlian** per Program (mis: TSM → Teknik Sepeda Motor, Teknik Pendingin & Tata Udara)
- Daftar **Mata Pelajaran** (Umum + Dasar Kejuruan + Produktif)
- Mapping **JP per Minggu / per Semester**
- Alokasi waktu per mata pelajaran

### 3.3 Ownership & Modification

- **Super Admin:** Hanya mengelola **template** (read-only reference data)
- **Sekolah Admin:** Mengaktifkan template → mendapatkan **copy scoped ke sekolah** → bisa modifikasi

---

## 4. Jadwal Pelajaran (`schedules`)

### 4.1 Mengapa Tabel Terpisah?

Tabel `classes` existing hanya menyimpan informasi dasar kelas (nama, level, program). Tidak dirancang untuk menampung jadwal. Dibutuhkan tabel `schedules` terpisah karena:

1. **Flexibility** — Jadwal bisa berubah per semester tanpa mengubah definisi kelas
2. **Multi-kelas** — Satu jadwal bisa digunakan banyak kelas (mis: mapel Produktif kadang shared antar kelas)
3. **Time slots** — Jadwal butuh detail hari, jam mulai-selesai, ruangan
4. **Guru assignment** — Satu sesi bisa punya guru utama + guru pendamping

### 4.2 Relasi `schedules` vs `classes`

```
classes (existing)
  │
  ├─ contains → students
  ├─ belongs_to → academic_year
  └─ owns → schedules (NEW)

schedules (NEW)
  │
  ├─ belongs_to → class (existing)
  ├─ belongs_to → school_subjects (NEW)
  ├─ belongs_to → teachers (existing) — guru pengajar
  ├─ has → time_slots
  └─ scoped → semester
```

### 4.3 Fitur Jadwal Per Semester

Setiap semester memungkinkan perubahan:
- **Jam pelajaran** — alokasi JP per mapel bisa beda tiap semester
- **Hari** — distribusi hari bisa berbeda
- **Mata pelajaran** — mapel produktif bisa berubah (mis: semester 1 DD + DP, semester 2 DP + SP)
- **Guru** — penugasan guru mengajar bisa berubah

---

## 5. Guru Produktif Multi-Kompetensi

### 5.1 Scenario

Satu guru produktif bisa mengajar beberapa kompetensi keahlian, contohnya:

- **Bpk. Ahmad** — mengajar di TSM (Teknik Sepeda Motor) untuk mapel Dasar Kejuruan di Kelas X, DAN mengajar mapel Produktif Spesifik di Kelas XI
- **Ibu Sari** — mengajar di dua program berbeda (TSM + TITL) karena shared expertise

### 5.2 Implementasi

Tidak butuh relasi `teachers ↔ specializations` langsung. Cukup via:
- `teaching_assignments` (existing) — sudah support mapping guru → kelas → mapel
- `schedules` (NEW) — mem-link `school_subjects` ke guru
- `school_specializations` (NEW) — untuk tracking di kompetensi mana guru mengajar

---

## 6. Perbedaan Mapel Umum vs Produktif

| Aspek | Mapel Umum | Mapel Produktif |
|-------|-----------|-----------------|
| Owner | Super Admin (global) | Sekolah (scoped) |
| Kategori | Pendidikan Agama, PKN, Bahasa, PJOK, Matematika, Seni, Bahasa Inggris, Prakarya & KK, BPVR, Pengembang Profesi | Dasar Kejuruan (DD), Produktif Spesifik (SPR) |
| JP Nasional | Fixed per Permen | Flexible per program keahlian |
| Modification | Sekolah tidak bisa modifikasi isi | Sekolah bisa modifikasi nama, JP, alokasi |

**Catatan:** Mapel Umum tetap di tabel `subjects` existing. Mapel Produktif masuk ke `school_subjects` (NEW).

---

## 7. Rencana Implementasi (High-Level)

### Phase 1: Struktur Jurusan
- [ ] Add `education_level` ENUM column to `schools` table
- [ ] Create `programs` table (super admin scope)
- [ ] Create `specializations` table (linked to programs)
- [ ] Create `school_programs` table (school ↔ program)
- [ ] Create `school_specializations` table (school ↔ program ↔ specialization)

### Phase 2: School Subjects & Kurikulum Template
- [ ] Create `school_subjects` table (adopted from template, scoped per sekolah)
- [ ] Create `kurikulum_templates` table (super admin managed)
- [ ] Create `kurikulum_structures` table (semester ↔ school_subjects mapping)
- [ ] API endpoints: list templates, activate template, manage school curriculum

### Phase 3: Schedules
- [ ] Create `schedules` table (class × school_subject × teacher × semester)
- [ ] Create `schedule_time_slots` table (day, start_time, end_time, room)
- [ ] API endpoints: CRUD schedules, assign teachers, view by class/semester

### Phase 4: Integration & Validation
- [ ] Cross-school isolation for school_subjects, programs, specializations
- [ ] Role-based access: Super Admin manages templates, School Admin manages own curriculum
- [ ] Validate schedule conflicts (guru, room, class)

---

## 8. Pertanyaan yang Belum Dijawab (Backlog)

1. **Sertifikasi Kompetensi** — Apakah perlu tracking sertifikasi/hasil uji kompetensi? (disebut di requirement awal tapi belum didiskusikan detail)
2. **Nilai Praktik vs Teori** — Apakah perlu pemisahan nilai untuk mapel produktif (teori/praktik/lab)? (grade system existing belum distinguish tipe)
3. **Tracking Jam Pelajaran** — Apakah perlu distinguishing JP produktif vs umum untuk laporan?
4. **Kurikulum 2013** — Diputar ke future, tapi apakah ada timeline?
5. **SMA Support** — SMA tidak butuh jurusan, apakah perlu table `programs` juga valid untuk SMA? Atau `education_level` filter sudah cukup?

---

*Diskusi ini disimpan sebagai baseline desain sebelum implementasi.*
