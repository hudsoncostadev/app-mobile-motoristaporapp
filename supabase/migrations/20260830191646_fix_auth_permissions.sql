/*
# Fix auth schema permissions

The authenticator role lost permissions on auth tables, causing
"Database error querying schema" during login/signup. The Supabase
Auth service uses the authenticator role to query the database.

1. Changes
   - Grant necessary permissions on auth tables to authenticator
*/

-- Grant permissions on all auth tables to authenticator
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT USAGE ON SCHEMA auth TO authenticator, service_role;
