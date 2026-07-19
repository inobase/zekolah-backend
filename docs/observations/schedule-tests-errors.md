# Observations: Schedule Test Failures

> **Date:** 2026-07-19
> **File:** `tests/schedule.test.ts`
> **Status:** 13/20 tests failing, 7/20 passing

## Summary

20 total tests in `schedule.test.ts`. **13 tests fail**, **7 tests pass**.

## Root Cause: Missing `createTeacherForSchool` Helper Function

The test file contains a comment `// Helper for creating extra teachers` at the very end but the `createTeacherForSchool` function is **never defined**. Despite this, **13 tests** reference it:

```
❌ POST then GET lists schedules with pagination         — createTeacherForSchool is not defined
❌ GET filters by class_id                                — createTeacherForSchool is not defined
❌ GET filters by teacher_id                              — createTeacherForSchool is not defined
❌ GET by ID returns schedule with details                — createTeacherForSchool is not defined
❌ PATCH updates a schedule                               — createTeacherForSchool is not defined
❌ DELETE deletes a schedule                              — createTeacherForSchool is not defined
❌ POST returns 409 for class double-booking              — createTeacherForSchool is not defined
❌ POST returns 409 for teacher double-booking            — createTeacherForSchool is not defined
❌ GET /schedules/class/:classId returns schedules for class — createTeacherForSchool is not defined
❌ GET /schedules/class/:classId/timetable returns grouped by day — createTeacherForSchool is not defined
❌ GET /schedules/conflicts returns conflict list         — createTeacherForSchool is not defined
❌ TEACHER cannot POST schedules (write)                  — createTeacherForSchool is not defined
❌ Cross-school access returns filtered results           — createTeacherForSchool is not defined
```

## Passing Tests (7/20)

1. ✅ POST creates a schedule with time slots
2. ✅ POST returns 400 if time_slots is empty
3. ✅ POST returns 400 if start_time >= end_time
4. ✅ POST requires authentication
5. ✅ GET by ID returns 404 for non-existent schedule
6. ✅ PATCH returns 404 for non-existent schedule
7. ✅ TEACHER can GET schedules (read)

## Existing Helper Pattern (for reference)

The file already defines `createSchoolAndTeacher(schoolId: number)` which:
- Creates a user + teacher scoped to a school
- Uses email pattern `test_teacher_${schoolId}@zet.com`
- Returns `{ teacherEmail, tUid, teacherId }`

The missing `createTeacherForSchool(schoolId: number, suffix: string)` should follow the same pattern but accept a `suffix` string for unique email naming.

## Potential Secondary Issue: Cross-School Test

The failing "Cross-school access returns filtered results" test may have a **secondary issue**: school B does not have an activated `school_programs` entry, so creating a school subject for school B in that test could fail. However, this is masked by the primary `createTeacherForSchool` error.

## Recommendation

Add `createTeacherForSchool` helper function to the end of `schedule.test.ts`, following the pattern of `createSchoolAndTeacher`. Then re-run tests to verify all 20 pass.

---

## Fix Applied — 2026-07-19 ✅ RESOLVED

Three bugs were identified and fixed:

### Bug 1: Missing `createTeacherForSchool` helper (caused 13 failures)
- **Location:** `tests/schedule.test.ts` — file ended with comment `// Helper for creating extra teachers` but no function
- **Fix:** Added `createTeacherForSchool(schoolId, suffix)` function inside the `describe` block so it has access to `knex`

### Bug 2: `SCHEDULE_CONFLICT` error mapping to 500 instead of 409 (caused 2 failures)
- **Location:** `src/utils/AppError.ts` — `SCHEDULE_CONFLICT` was missing from the `defaultStatusFor` switch
- **Fix:** Added `case 'SCHEDULE_CONFLICT': return 409;`

### Bug 3: Teacher role could POST/PATCH/DELETE schedules (caused 1 failure)
- **Location:** `src/routes/schedule.routes.ts` — POST, PATCH, DELETE had no `requireRole` guard
- **Fix:** Added `preHandler: requireRole(['admin', 'super_admin'])` to POST, PATCH, DELETE routes

## Final Result

All **20/20 tests passing** ✅
