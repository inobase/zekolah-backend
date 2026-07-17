# Table: `students`

> Student profiles linked to users, scoped to classes and schools.
> **Migration:** `007_students.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique student identifier |
| `nis` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | Student ID number (Nomor Induk Siswa) |
| `nisn` | `VARCHAR(50)` | `UNIQUE`, `NULL` | National Student ID (Nomor Induk Siswa Nasional) |
| `user_id` | `INTEGER UNSIGNED` | `NOT NULL`, `UNIQUE` | Associated user account |
| `date_of_birth` | `DATE` | `NULL` | Birth date |
| `gender` | `VARCHAR(10)` | `NULL` | Gender |
| `parent_name` | `VARCHAR(200)` | `NULL` | Parent/guardian name |
| `parent_phone` | `VARCHAR(50)` | `NULL` | Parent/guardian phone |
| `phone` | `VARCHAR(50)` | `NULL` | Student phone |
| `address` | `STRING` | `NULL` | Physical address |
| `class_id` | `INTEGER UNSIGNED` | `NULL` | Assigned class |
| `school_id` | `INTEGER UNSIGNED` | `NOT NULL` | Parent school |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| nis_unique | `UNIQUE` | `nis` |
| nisn_unique | `UNIQUE` | `nisn` |
| user_id_unique | `UNIQUE` | `user_id` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `user_id` | `users(id)` | `CASCADE` |
| `class_id` | `classes(id)` | — (no action) |
| `school_id` | `schools(id)` | — (no action) |

## Remarks

- Each student must have a linked `user` account. Deletion of a user cascades to the student profile.
- `class_id` is nullable — students can be unassigned to a class.
- Referenced by: `class_students(student_id)`, `attendance(student_id)`, `grades(student_id)`, `submissions(student_id)`.
