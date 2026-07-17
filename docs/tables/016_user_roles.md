# Table: `user_roles`

> Scoped role assignments: user + role + school + academic_year.
> **Migration:** `016_user_roles.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique role assignment identifier |
| `user_id` | `INTEGER UNSIGNED` | `NOT NULL` | Assigned user |
| `role_id` | `INTEGER UNSIGNED` | `NOT NULL` | Role template |
| `school_id` | `INTEGER UNSIGNED` | `NULL` | Scoping school (`NULL` = cross-school / global) |
| `academic_year_id` | `INTEGER UNSIGNED` | `NULL` | Scoping academic year (`NULL` = all years) |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Whether this assignment is currently active |
| `granted_at` | `TIMESTAMP` | `NULL` | When this role was assigned |
| `granted_by` | `INTEGER UNSIGNED` | `NULL` | User who granted this role assignment |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| unique_assignment | `UNIQUE` | `user_id`, `role_id`, `school_id`, `academic_year_id` |
| user_scope | `INDEX` | `user_id`, `school_id`, `academic_year_id`, `is_active` |
| role_filter | `INDEX` | `role_id`, `school_id`, `is_active` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `user_id` | `users(id)` | `CASCADE` |
| `role_id` | `roles(id)` | — (no action) |
| `school_id` | `schools(id)` | `SET NULL` |
| `academic_year_id` | `academic_years(id)` | `SET NULL` |
| `granted_by` | `users(id)` | `SET NULL` |

## Data Migration (from legacy system)

This migration also migrates existing role data from:
1. **`users.role`** — Direct role column for non-teacher/non-student users (e.g., `admin`)
2. **`teachers.school_id`** — Migrated to `user_roles` with `role_id = teacher`
3. **`students.school_id`** — Migrated to `user_roles` with `role_id = student`

See [migration `017`](./017_drop_users_role_column.md) for the legacy `users.role` column removal.

## Remarks

- This table implements **multi-tenant role-based access control (RBAC)**.
- A user can have different roles across different schools and academic years.
- `school_id = NULL` denotes a **cross-school** role (e.g., super_admin).
- `academic_year_id = NULL` denotes a role that applies to **all academic years**.
- Referenced by: `requireRole` middleware for authentication.
