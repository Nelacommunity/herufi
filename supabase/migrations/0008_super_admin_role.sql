-- Step 1 of 2: add the super_admin role.
-- Postgres can't use a new enum value in the same transaction that adds it, so run this file on its own,
-- then run 0009_staff_permissions.sql.
alter type public.user_role add value if not exists 'super_admin';
