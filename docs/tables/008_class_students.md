# Table: `class_students`

> Junction table linking students to classes within an academic year.
> **Migration:** `008_class_students.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique class enrollment identifier |
| `class_id` | `INTEGER UNSIGNED` | `NOT NULL` | Target class |
| `student_id` | `INTEGER UNSIGNED` | `NOT NULL` | Enrolled student |
| `academic_year_id` | `INTEGER UNSIGNED` | `NOT NULL` | Associated academic year |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `class_id` | `classes(id)` | — (no action) |
| `student_id` | `students(id)` | `CASCADE` |
| `academic_year_id` | `academic_years(id)` | — (no action) |

## Remarks

- This is a **many-to-many junction table** — the same student can be enrolled in different classes across different academic years.
- The combination of `(class_id, student_id, academic_year_id)` effectively defines a unique enrollment.
- Referenced by: `attendance(student_id)`, `grades(student_id)`, `submissions(student_id -> via assignments.class_id)`.
