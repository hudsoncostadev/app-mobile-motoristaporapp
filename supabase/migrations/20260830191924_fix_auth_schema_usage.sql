/*
# Grant USAGE on auth schema to authenticator

The authenticator role (used by Supabase Auth service) was missing
USAGE permission on the auth schema, causing "Database error querying
schema" on every login/signup attempt.

1. Changes
   - GRANT USAGE ON SCHEMA auth TO authenticator
*/

GRANT USAGE ON SCHEMA auth TO authenticator;
