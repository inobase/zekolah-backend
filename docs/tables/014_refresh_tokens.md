# Table: `refresh_tokens`

> JWT refresh tokens for authentication persistence.
> **Migration:** `014_refresh_tokens.ts`

## Column Definitions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | `INTEGER` (auto-increment) | `PRIMARY KEY`, `NOT NULL` | Unique token record identifier |
| `user_id` | `INTEGER UNSIGNED` | `NOT NULL` | Associated user |
| `token` | `VARCHAR(500)` | `UNIQUE`, `NOT NULL` | Refresh token value |
| `expires_at` | `TIMESTAMP` | `NOT NULL` | Token expiration time |
| `revoked_reason` | `VARCHAR(100)` | `NULL` | Reason for revocation (e.g., `logout`, `password_change`) |
| `revoked_at` | `TIMESTAMP` | `NULL` | Token revocation time |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMP` | `ON UPDATE CURRENT_TIMESTAMP` | Record last update time |

## Indexes

| Index | Type | Columns |
|-------|------|---------|
| (primary) | `PRIMARY KEY` | `id` |
| token_unique | `UNIQUE` | `token` |

## Foreign Keys

| Column | References | On Delete |
|--------|-----------|-----------|
| `user_id` | `users(id)` | `CASCADE` |

## Remarks

- Used in the authentication flow to issue new access tokens without re-authentication.
- Tokens are revoked on logout or password change. Stale tokens are cleaned up by expiration checks.
