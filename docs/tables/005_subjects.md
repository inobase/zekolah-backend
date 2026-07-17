# Table: `subjects`

> Academic subjects (e.g., Mathematics, Physics) scoped per school.
> **Migration:** `005_subjects.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique subject identifier |
| `name` | `VARCHAR(200)` | `NOT NULL` | Subject name (e.g., `Matematika`) |
| `code` | `VARCHAR(50)` | `NOT NULL` | Subject code (e.g., `MTK`) |
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
| `school_id` | `schools(id)` | — (no action) |

## Remarks

- Subjects are **scoped per school**, allowing different schools to have different subject catalogs.
- Referenced by: `teaching_assignments(subject_id)`, `attendance(subject_id)`, `grades(subject_id)`, `assignments(subject_id)`.
