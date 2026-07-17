# Table: `users`

> Core identity table. No foreign key dependencies.
> **Migration:** `001_users.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique user identifier |
| `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL` | User email address |
| `password` | `VARCHAR(255)` | `NOT NULL` | Hashed password |
| `name` | `VARCHAR(200)` | `NOT NULL` | User full name |
| `role` | `VARCHAR(50)` | `DEFAULT 'student'` | User role (legacy — deprecated by `user_roles`) |
| `phone` | `VARCHAR(20)` | `NULL` | Contact phone number |
| `avatar_url` | `VARCHAR(500)` | `NULL` | Avatar image URL |
| `address` | `TEXT` | `NULL` | Physical address |
| `status` | `VARCHAR(20)` | `DEFAULT 'active'` | Account status |
| `last_login` | `TIMESTAMP` | `NULL` | Last login timestamp |
| `email_verified_at` | `TIMESTAMP` | `NULL` | Email verification timestamp |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| email_unique | `UNIQUE` | `email` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| *(none)* | — | — |

## Remarks

- This is the foundational identity table for all system actors (students, teachers, admins, super admins).
- The `role` column is **deprecated** as of v1.0.5. Role assignments are now managed via the `user_roles` table with school/academic-year scoping ([migration `016`](../migrations/016_user_roles.ts), [migration `017`](../migrations/017_drop_users_role_column.ts)).
- Directly referenced by: `teachers(user_id)`, `students(user_id)`, `refresh_tokens(user_id)`, `user_roles(user_id)`.
