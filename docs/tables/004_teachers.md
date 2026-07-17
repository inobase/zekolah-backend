# Table: `teachers`

> Teacher profiles linked to users and scoped to schools.
> **Migration:** `004_teachers.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique teacher identifier |
| `nip` | `VARCHAR(100)` | `UNIQUE`, `NULL` | Teacher ID number (National Employee Number) |
| `user_id` | `INTEGER UNSIGNED` | `NOT NULL`, `UNIQUE` | Associated user account |
| `specialization` | `VARCHAR(200)` | `NULL` | Teaching specialization area |
| `address` | `STRING` | `NULL` | Physical address |
| `phone` | `VARCHAR(50)` | `NULL` | Contact phone number |
| `school_id` | `INTEGER UNSIGNED` | `NOT NULL` | Parent school |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| user_id_unique | `UNIQUE` | `user_id` |
| nip_unique | `UNIQUE` | `nip` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `user_id` | `users(id)` | `CASCADE` |
| `school_id` | `schools(id)` | — (no action) |

## Remarks

- Each teacher must have a linked `user` account. Deletion of a user cascades to the teacher profile.
- Referenced by: `classes(class_advisor_id)`, `teaching_assignments(teacher_id)`, `assignments(teacher_id)`, `grades(teacher_id)`.
