# Table: `grades`

> Student assessment scores per subject per academic year.
> **Migration:** `011_grades.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique grade record identifier |
| `student_id` | `INTEGER UNSIGNED` | `NOT NULL` | Student |
| `subject_id` | `INTEGER UNSIGNED` | `NOT NULL` | Subject |
| `academic_year_id` | `INTEGER UNSIGNED` | `NOT NULL` | Associated academic year |
| `assessment_type` | `VARCHAR(100)` | `NOT NULL` | Assessment label (e.g., `UH-1`, `UAS`, `Tugas`) |
| `score` | `DECIMAL(5,2)` | `NOT NULL` | Student's achieved score |
| `max_score` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 100` | Maximum possible score |
| `teacher_id` | `INTEGER UNSIGNED` | `NULL` | Teacher who recorded the grade |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `student_id` | `students(id)` | `CASCADE` |
| `subject_id` | `subjects(id)` | `CASCADE` |
| `academic_year_id` | `academic_years(id)` | `CASCADE` |
| `teacher_id` | `teachers(id)` | `SET NULL` |

## Remarks

- `assessment_type` allows multiple assessments per student-subject pair (e.g., quizzes, mid-term, final exam).
- The composite key `(student_id, subject_id, academic_year_id, assessment_type)` can be used for deduplication at the application layer.
