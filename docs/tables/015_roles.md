# Table: `roles`

> Global role lookup table. Seeded with 5 baseline roles.
> **Migration:** `015_roles.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique role identifier |
| `name` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | Role slug (e.g., `admin`, `teacher`) |
| `description` | `VARCHAR(255)` | `NULL` | Human-readable role description |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| name_unique | `UNIQUE` | `name` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| *(none)* | — | — |

## Pre-seeded Roles

| ID | Name | Description |
|----|------|-------------|
| 1 | `super_admin` | Platform owner. Cross-school access via `school_id = NULL`. |
| 2 | `admin` | School administrator. Manages teachers, students, and academic config within a school. |
| 3 | `staff` | School operator (TU, kepsek). Limited admin actions within a school. |
| 4 | `teacher` | Teaching staff. Manages assignments, grades, attendance for assigned classes. |
| 5 | `student` | Enrolled student. Views own grades, assignments, attendance. |

## Remarks

- Roles are **global** (not scoped to schools). They serve as role templates.
- Actual role assignments with scoping are managed via the `user_roles` table.
- Referenced by: `user_roles(role_id)`.
