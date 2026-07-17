# Table: `academic_years`

> Academic year / semester periods scoped to a school.
> **Migration:** `003_academic_years.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique academic year identifier |
| `school_id` | `INTEGER UNSIGNED` | `NOT NULL` | Parent school |
| `year` | `VARCHAR(20)` | `NOT NULL` | Academic year label (e.g., `2025/2026`) |
| `start_date` | `DATE` | `NOT NULL` | Start date of the academic period |
| `end_date` | `DATE` | `NOT NULL` | End date of the academic period |
| `semester` | `VARCHAR(10)` | `DEFAULT 'ganjil'` | Semester label (`ganjil` / `genap`) |
| `status` | `VARCHAR(20)` | `DEFAULT 'upcoming'` | Status: `upcoming`, `active`, `completed` |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `school_id` | `schools(id)` | — (no action) |

## Remarks

- Academic years are **scoped per school**. Multiple schools can have independent academic calendars.
- Referenced by: `classes(academic_year_id)`, `teaching_assignments(academic_year_id)`, `attendance(academic_year_id via classes)`, `grades(academic_year_id)`, `assignments(academic_year_id)`, `class_students(academic_year_id)`, `user_roles(academic_year_id)`.
