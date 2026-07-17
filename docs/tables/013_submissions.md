# Table: `submissions`

> Student submissions for assignments with grading support.
> **Migration:** `013_submissions.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique submission identifier |
| `assignment_id` | `INTEGER UNSIGNED` | `NOT NULL` | Target assignment |
| `student_id` | `INTEGER UNSIGNED` | `NOT NULL` | Submitting student |
| `attachments` | `VARCHAR(500)` | `NULL` | Submitted file URL(s) |
| `comments` | `TEXT` | `NULL` | Student's text comments with submission |
| `score` | `DECIMAL(5,2)` | `NULL` | Graded score |
| `submitted_at` | `DATE` | `NULL` | Submission timestamp |
| `graded_at` | `DATE` | `NULL` | Grading timestamp |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | Submission status (`pending`, `submitted`, `graded`) |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| assignment_student | `INDEX` | `assignment_id`, `student_id` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `assignment_id` | `assignments(id)` | `CASCADE` |
| `student_id` | `students(id)` | `CASCADE` |

## Remarks

- Substitutions support file uploads via `multipart/form-data` (attachments stored as URL paths).
- Composite index on `(assignment_id, student_id)` optimizes the common lookup: "has this student submitted this assignment?"
