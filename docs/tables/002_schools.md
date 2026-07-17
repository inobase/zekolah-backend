# Table: `schools`

> Tenant root table; most other entities FK into it.
> **Migration:** `002_schools.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique school identifier |
| `name` | `VARCHAR(200)` | `NOT NULL` | School name |
| `code` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL` | School code (e.g., `SCH001`) |
| `email` | `VARCHAR(255)` | `NULL` | School contact email |
| `phone` | `VARCHAR(20)` | `NULL` | School contact phone |
| `address` | `STRING` | `NULL` | Physical address |
| `city` | `VARCHAR(100)` | `NULL` | City location |
| `province` | `VARCHAR(100)` | `NULL` | Province location |
| `logo_url` | `VARCHAR(500)` | `NULL` | Logo/image URL |
| `status` | `VARCHAR(20)` | `DEFAULT 'active'` | School operational status |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| code_unique | `UNIQUE` | `code` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| *(none)* | — | — |

## Remarks

- This is the **tenant root** table. Most other entities in the system are scoped to a school via `school_id`.
- Directly referenced by: `academic_years(school_id)`, `teachers(school_id)`, `subjects(school_id)`, `classes(school_id)`, `students(school_id)`, `user_roles(school_id)`.
