# Migration: Drop `users.role` column

> Deprecates the legacy `users.role` column in favor of `user_roles` table.
> **Migration:** `017_drop_users_role_column.ts`

## Purpose

This migration **removes the `role` column** from the `users` table after all role data has been successfully migrated to the `user_roles` table (via migration `016`).

## Operation

### Up (apply)
```sql
ALTER TABLE users DROP COLUMN role;
```

All role assignments are now exclusively managed through the `user_roles` table with school and academic-year scoping.

### Down (rollback)
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'student';
```

Re-adds the legacy column for backward compatibility during rollback.

## Related

- [Migration `015`](./015_roles.md) — Creates the `roles` lookup table
- [Migration `016`](./016_user_roles.md) — Creates `user_roles` with data migration from legacy columns
- [Table `users`](./001_users.md) — The `users` table affected by this migration

## Impact

After this migration:
- The `requireRole` middleware no longer checks the `users.role` column.
- All role resolution goes through `user_roles` with proper tenant and academic-year scoping.
