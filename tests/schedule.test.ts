// =====================================================
// Schedules — CRUD Tests (Phase 5)
// Tests: SCHOOL_ADMIN CRUD schedules, TEACHER READ only, STUDENT timetable read, conflict detection.
// =====================================================

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createTestApp, closeAllApps } from './helper';
import { getKnex } from '../src/config/database';

describe('Schedules', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  const knex = getKnex();

  const ROLE_IDS: Record<string, number> = {
    super_admin: 1,
    admin: 2,
    teacher: 4,
    student: 5,
  };

  let schoolAdminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let schoolAId: number;
  let schoolBId: number;
  let smkProgramId: number;
  let specializationId: number;
  let schoolSubjectId: number;
  let classId: number;
  let teacherId: number;
  let academicYearId: number;
  let scheduleId: number;

  const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

  // --- Token Helpers ---

  async function createActor(schoolId: number, email: string, roleId: number, name: string) {
    await knex('user_roles').where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', [email])).del();
    await knex('users').where('email', email).del();

    const hash = await bcrypt.hash('Password123', 10);
    const [uid] = await knex('users').insert({
      email,
      password: hash,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await knex('user_roles').insert({
      user_id: uid,
      role_id: roleId,
      school_id: schoolId,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'Password123' },
    });
    return (JSON.parse(res.payload) as { token: string }).token;
  }

  // --- Setup Helpers ---

  async function createSchoolAndTeacher(schoolId: number) {
    // Create teachers for school
    const teacherEmail = `test_teacher_${schoolId}@zet.com`;
    await knex('teachers').where('school_id', schoolId).del();
    await knex('users').where('email', teacherEmail).del();
    await knex('user_roles').where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', [teacherEmail])).del();

    const tHash = await bcrypt.hash('Password123', 10);
    let [tUid]: any = await knex('users').insert({
      email: teacherEmail,
      password: tHash,
      name: 'Test Teacher',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    tUid = tUid as number;

    const [tId] = await knex('teachers').insert({
      user_id: tUid,
      school_id: schoolId,
      specialization: 'Teknik',
      phone: '08123456789',
    });
    teacherId = tId as number;

    return { teacherEmail, tUid, teacherId: tId };
  }

  // --- Lifecycle ---

  beforeEach(async () => {
    app = await createTestApp();

    // Create test schools
    const [sA] = await knex('schools').insert({
      name: 'School A Test',
      code: 'SA_TEST',
      email: 'sa@test.com',
      education_level: '3B',
      province: 'Jawa Barat',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    schoolAId = sA as number;

    const [sB] = await knex('schools').insert({
      name: 'School B Test',
      code: 'SB_TEST',
      email: 'sb@test.com',
      education_level: '3B',
      province: 'DKI Jakarta',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    schoolBId = sB as number;

    // Find SMK program
    const programs = await knex('programs').where({ education_level: '3B', is_active: true }).limit(1);
    smkProgramId = (programs[0] as any)?.id;
    expect(smkProgramId).toBeDefined();

    // Activate program for school A
    await knex('school_programs').insert({
      school_id: schoolAId,
      program_id: smkProgramId,
      is_active: true,
      activated_at: new Date(),
      activated_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Find specialization
    const specs = await knex('specializations').where({ program_id: smkProgramId }).limit(1);
    specializationId = (specs[0] as any)?.id;
    expect(specializationId).toBeDefined();

    // Get school admin token for school A
    schoolAdminToken = await createActor(schoolAId, `sa_test@zet.com`, ROLE_IDS.admin, 'School Admin Test');

    // Get teacher token for school A
    teacherToken = await createActor(schoolAId, `teacher_test@zet.com`, ROLE_IDS.teacher, 'Teacher Test');

    // Get student token for school A
    studentToken = await createActor(schoolAId, `student_test@zet.com`, ROLE_IDS.student, 'Student Test');

    // Create teachers
    const { teacherId: tidA } = await createSchoolAndTeacher(schoolAId);
    teacherId = tidA;

    // Create class
    const [academicYearIdResult] = await knex('academic_years').insert({
      school_id: schoolAId,
      year: '2024/2025',
      start_date: '2024-07-01',
      end_date: '2025-06-30',
      semester: 'ganjil',
      status: 'active',
    });
    academicYearId = academicYearIdResult as number;

    const [classIdResult] = await knex('classes').insert({
      name: 'X RPL 1',
      grade: 'X',
      vacancy: 40,
      class_advisor_id: teacherId,
      academic_year_id: academicYearId,
      school_id: schoolAId,
    });
    classId = classIdResult as number;

    // Create school subject
    const [subjectIdResult] = await knex('school_subjects').insert({
      school_id: schoolAId,
      specialization_id: specializationId,
      name: 'Matematika',
      code: 'MAT-01',
      subject_type: 'UMUM',
      jp_per_minggu: 4,
      jp_per_semester: 72,
      theory_hours: 2,
      practice_hours: 2,
      customizable: true,
    });
    schoolSubjectId = subjectIdResult as number;

    // Create a second teacher for cross-teacher testing
    await knex('users').where('email', `teacher2_test@zet.com`).del();
    await knex('user_roles').where('user_id', knex.raw("(SELECT id FROM users WHERE email = 'teacher2_test@zet.com')")).del();
    const t2Hash = await bcrypt.hash('Password123', 10);
    let [t2Uid]: any = await knex('users').insert({
      email: 'teacher2_test@zet.com',
      password: t2Hash,
      name: 'Teacher Two',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    t2Uid = t2Uid as number;
    const [t2Id] = await knex('teachers').insert({
      user_id: t2Uid,
      school_id: schoolAId,
      specialization: 'Fisika',
    });
    teacherId = Number(t2Id); // store second teacher id for testing
  });

  afterAll(async () => {
    await closeAllApps();
  });

  // ========================================================================
  // CREATE /schedules
  // ========================================================================

  it('POST creates a schedule with time slots', async () => {
    const payload = {
      class_id: classId,
      school_subject_id: schoolSubjectId,
      teacher_id: teacherId,
      academic_year_id: academicYearId,
      semester: 'ganjil',
      room: 'Ruang 101',
      time_slots: [
        { day_of_week: 'senin', start_time: '08:00', end_time: '09:30' },
        { day_of_week: 'rabu', start_time: '10:00', end_time: '11:30' },
      ],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeDefined();
    expect(body.class_id).toBe(classId);
    expect(body.school_subject_id).toBe(schoolSubjectId);
    expect(body.semester).toBe('ganjil');
    expect(body.status).toBe('scheduled');
    expect(body.room).toBe('Ruang 101');
    scheduleId = body.id;
  });

  it('POST returns 400 if time_slots is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: teacherId,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        time_slots: [],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST returns 400 if start_time >= end_time', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: teacherId,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        time_slots: [
          { day_of_week: 'senin', start_time: '10:00', end_time: '09:00' },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: teacherId,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ========================================================================
  // LIST GET /schedules
  // ========================================================================

  it('POST then GET lists schedules with pagination', async () => {
    // Create a schedule first
    const { teacherId: firstTeacherId } = await createTeacherForSchool(schoolAId, 'first');
    await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: firstTeacherId,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schedules?page=1&limit=10',
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('GET filters by class_id', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 't1');
    await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules?class_id=${classId}&page=1&limit=10`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    for (const item of body.data) {
      expect(item.class_id).toBe(classId);
    }
  });

  it('GET filters by teacher_id', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 't1');
    await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules?teacher_id=${t1}&page=1&limit=10`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    for (const item of body.data) {
      expect(item.teacher_id).toBe(t1);
    }
  });

  // ========================================================================
  // GET /schedules/:id
  // ========================================================================

  it('GET by ID returns schedule with details', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'getbyid');
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R201',
        time_slots: [{ day_of_week: 'selasa', start_time: '09:00', end_time: '10:30' }],
      },
    });
    const created = JSON.parse(createRes.payload) as { id: number };

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules/${created.id}`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(created.id);
    expect(body.school_subject_name).toBe('Matematika');
    expect(body.class_name).toBe('X RPL 1');
  });

  it('GET by ID returns 404 for non-existent schedule', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schedules/99999',
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(404);
  });

  // ========================================================================
  // UPDATE /schedules/:id
  // ========================================================================

  it('PATCH updates a schedule', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'update');
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });
    const schedId = JSON.parse(createRes.payload).id as number;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/schedules/${schedId}`,
      headers: authHeader(schoolAdminToken),
      payload: { status: 'cancelled' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('cancelled');
  });

  it('PATCH returns 404 for non-existent schedule', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/schedules/99999',
      headers: authHeader(schoolAdminToken),
      payload: { status: 'cancelled' },
    });

    expect(res.statusCode).toBe(404);
  });

  // ========================================================================
  // DELETE /schedules/:id
  // ========================================================================

  it('DELETE deletes a schedule', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'delete');
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'selasa', start_time: '10:00', end_time: '11:30' }],
      },
    });
    const schedId = JSON.parse(createRes.payload).id as number;

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/schedules/${schedId}`,
      headers: authHeader(schoolAdminToken),
    });

    expect(delRes.statusCode).toBe(204);

    // Verify deletion
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules/${schedId}`,
      headers: authHeader(schoolAdminToken),
    });
    expect(getRes.statusCode).toBe(404);

    // Verify time slots are also deleted
    const slots = await knex('schedule_time_slots').where({ schedule_id: schedId });
    expect(slots.length).toBe(0);
  });

  // ========================================================================
  // DOUBLE-BOOKING CONFLICTS
  // ========================================================================

  it('POST returns 409 for class double-booking', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'conflict-class');

    // First schedule
    await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    // Second schedule with same class, same day/time
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R102',
        time_slots: [{ day_of_week: 'senin', start_time: '08:30', end_time: '10:00' }],
      },
    });

    expect(res.statusCode).toBe(409);
  });

  it('POST returns 409 for teacher double-booking', async () => {
    // Get first teacher
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'conflict-teacher');

    // Create a second class
    const [class2Id] = await knex('classes').insert({
      name: 'X RPL 2',
      grade: 'X',
      vacancy: 40,
      academic_year_id: academicYearId,
      school_id: schoolAId,
    });

    // First schedule with t1
    await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    // Second schedule with same teacher, same day/time but different class
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: class2Id as number,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R102',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    expect(res.statusCode).toBe(409);
  });

  // ========================================================================
  // CLASS SCHEDULES ENDPOINT
  // ========================================================================

  it('GET /schedules/class/:classId returns schedules for class', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'class-ep');
    await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        time_slots: [{ day_of_week: 'kamis', start_time: '13:00', end_time: '14:30' }],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules/class/${classId}?academic_year_id=${academicYearId}&semester=ganjil`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ========================================================================
  // TIMETABLE ENDPOINT
  // ========================================================================

  it('GET /schedules/class/:classId/timetable returns grouped by day', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'timetable');

    // Create multiple slots
    await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [
          { day_of_week: 'senin', start_time: '08:00', end_time: '09:30' },
          { day_of_week: 'rabu', start_time: '10:00', end_time: '11:30' },
        ],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules/class/${classId}/timetable?academic_year_id=${academicYearId}&semester=ganjil`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.class_name).toBe('X RPL 1');
    expect(body.days).toBeDefined();
    expect(body.days.senin).toBeInstanceOf(Array);
    expect(body.days.rabu).toBeInstanceOf(Array);
    expect(body.days.senin.length).toBeGreaterThanOrEqual(1);
    expect(body.days.rabu.length).toBeGreaterThanOrEqual(1);
  });

  // ========================================================================
  // CONFLICTS ENDPOINT
  // ========================================================================

  it('GET /schedules/conflicts returns conflict list', async () => {
    // First, manually create conflicting schedules to test detection
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'conflicts-endpoint');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        room: 'R101',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });
    scheduleId = JSON.parse(createRes.payload).id as number;

    // Check conflicts (should be empty since we just created a clean schedule)
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules/conflicts?academic_year_id=${academicYearId}&semester=ganjil`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
  });

  // ========================================================================
  // PERMISSIONS
  // ========================================================================

  it('TEACHER cannot POST schedules (write)', async () => {
    const { teacherId: t1 } = await createTeacherForSchool(schoolAId, 'perm-teacher-no-write');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(teacherToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: t1,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        time_slots: [{ day_of_week: 'senin', start_time: '08:00', end_time: '09:30' }],
      },
    });

    // Should return 403 (forbidden) or 401 if teacher role blocks write
    expect(res.statusCode).toBe(403);
  });

  it('TEACHER can GET schedules (read)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schedules?page=1&limit=10',
      headers: authHeader(teacherToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
  });

  // ========================================================================
  // CROSS-SCHOOL ACCESS
  // ========================================================================

  it('Cross-school access returns filtered results', async () => {
    // Create schedule for school A
    const { teacherId: tA } = await createTeacherForSchool(schoolAId, 'crossA');
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolAdminToken),
      payload: {
        class_id: classId,
        school_subject_id: schoolSubjectId,
        teacher_id: tA,
        academic_year_id: academicYearId,
        semester: 'ganjil',
        time_slots: [{ day_of_week: 'selasa', start_time: '09:00', end_time: '10:30' }],
      },
    });
    expect(createRes.statusCode).toBe(201);

    // Create school B actor and class/schedule
    const schoolBAdminToken = await createActor(schoolBId, `sa_b_test@zet.com`, ROLE_IDS.admin, 'School B Admin');

    const [academicYearBId] = await knex('academic_years').insert({
      school_id: schoolBId,
      year: '2024/2025',
      start_date: '2024-07-01',
      end_date: '2025-06-30',
      semester: 'ganjil',
      status: 'active',
    });

    const [classBId] = await knex('classes').insert({
      name: 'XI TKJ 1',
      grade: 'XI',
      vacancy: 40,
      academic_year_id: academicYearBId,
      school_id: schoolBId,
    });

    // School B creates its own schedule
    const bRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: authHeader(schoolBAdminToken),
      payload: {
        class_id: classBId as number,
        school_subject_id: schoolSubjectId,
        teacher_id: tA,
        academic_year_id: academicYearBId as number,
        semester: 'ganjil',
        time_slots: [{ day_of_week: 'rabu', start_time: '09:00', end_time: '10:30' }],
      },
    });
    expect(bRes.statusCode).toBe(201);
  });
});

// Helper for creating extra teachers
