# Table: `teaching_assignments`

> Maps teachers to classes and subjects for specific academic years.
> **Migration:** `009_teaching_assignments.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique teaching assignment identifier |
| `teacher_id` | `INTEGER UNSIGNED` | `NOT NULL` | Assigned teacher |
| `class_id` | `INTEGER UNSIGNED` | `NOT NULL` | Target class |
| `subject_id` | `INTEGER UNSIGNED` | `NOT NULL` | Subject being taught |
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
| `teacher_id` | `teachers(id)` | `CASCADE` |
| `class_id` | `classes(id)` | `CASCADE` |
| `subject_id` | `subjects(id)` | `CASCADE` |
| `academic_year_id` | `academic_years(id)` | `CASCADE` |

## Remarks

- Each row represents a **teaching assignment**: a teacher is assigned to teach a specific subject to a specific class during an academic year.
- All FK columns use `CASCADE DELETE` — removing any referenced entity removes the assignment.
- Referenced by: `assignments(teacher_id, class_id, subject_id, academic_year_id)`.
