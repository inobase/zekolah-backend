# Table: `classes`

> Class/group containers (e.g., `X IPA 1`) scoped to a school and academic year.
> **Migration:** `006_classes.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique class identifier |
| `name` | `VARCHAR(50)` | `NOT NULL` | Class name (e.g., `X IPA 1`) |
| `grade` | `VARCHAR(5)` | `NOT NULL` | Grade level (e.g., `X`, `XI`, `XII`) |
| `vacancy` | `INTEGER` | `DEFAULT 40` | Maximum student capacity |
| `class_advisor_id` | `INTEGER UNSIGNED` | `NULL` | Homeroom teacher |
| `academic_year_id` | `INTEGER UNSIGNED` | `NOT NULL` | Associated academic year |
| `school_id` | `INTEGER UNSIGNED` | `NOT NULL` | Parent school |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `class_advisor_id` | `teachers(id)` | — (no action) |
| `academic_year_id` | `academic_years(id)` | — (no action) |
| `school_id` | `schools(id)` | — (no action) |

## Remarks

- Classes link a grade level to a specific academic year and school.
- Referenced by: `students(class_id)`, `class_students(class_id)`, `teaching_assignments(class_id)`, `assignments(class_id)`.
