# Table: `assignments`

> Teacher-created assignments (homework, projects) for classes.
> **Migration:** `012_assignments.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique assignment identifier |
| `teacher_id` | `INTEGER UNSIGNED` | `NOT NULL` | Creating teacher |
| `class_id` | `INTEGER UNSIGNED` | `NOT NULL` | Target class |
| `subject_id` | `INTEGER UNSIGNED` | `NOT NULL` | Related subject |
| `academic_year_id` | `INTEGER UNSIGNED` | `NOT NULL` | Associated academic year |
| `title` | `VARCHAR(300)` | `NOT NULL` | Assignment title |
| `description` | `TEXT` | `NULL` | Assignment description/instructions |
| `due_date` | `DATE` | `NOT NULL` | Deadline for submission |
| `max_score` | `DECIMAL(5,2)` | `DEFAULT 100` | Maximum score for this assignment |
| `attachments` | `VARCHAR(500)` | `NULL` | Attachment file URL(s) |
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

- Assignments are created by a teacher and assigned to a specific class and subject.
- Referenced by: `submissions(assignment_id)`.
