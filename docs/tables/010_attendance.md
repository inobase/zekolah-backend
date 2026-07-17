# Table: `attendance`

> Student attendance records per subject per day.
> **Migration:** `010_attendance.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique attendance record identifier |
| `student_id` | `INTEGER UNSIGNED` | `NOT NULL` | Attending student |
| `subject_id` | `INTEGER UNSIGNED` | `NOT NULL` | Subject for which attendance was taken |
| `date` | `DATE` | `NOT NULL` | Attendance date |
| `status` | `VARCHAR(10)` | `NOT NULL` | Attendance status (e.g., `present`, `absent`, `sick`, `leave`) |
| `reason` | `TEXT` | `NULL` | Reason for absence / late arrival |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| student_date | `INDEX` | `student_id`, `date` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `student_id` | `students(id)` | `CASCADE` |
| `subject_id` | `subjects(id)` | `CASCADE` |

## Remarks

- Attendance is recorded **per student per subject per day**.
- Composite index on `(student_id, date)` optimizes the most frequent query pattern (checking a student's attendance on a given date).
