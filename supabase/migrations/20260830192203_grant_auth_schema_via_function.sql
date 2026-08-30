/*
# Grant USAGE on auth schema to authenticator via SECURITY DEFINER

We can't GRANT USAGE ON SCHEMA auth TO authenticator directly because
the auth schema is owned by supabase_admin and we don't have permission
to grant on it. However, we can create a SECURITY DEFINER function owned
by a role that does have the right to grant.

Actually, let me try a different approach: ALTER DEFAULT PRIVILEGES
won't help here. Let me check if we can use the supabase_admin role
through a SECURITY DEFINER function.

Wait - actually, the postgres role has CREATEROLE and is a member of
many roles. Let me try granting via a SECURITY DEFINER function that
runs as postgres (which has BYPASSRLS).

Actually, the simplest fix: the GRANT USAGE ON SCHEMA might have failed
silently. Let me try it again and check the result explicitly.
*/

-- Try granting again and verify
GRANT USAGE ON SCHEMA auth TO authenticator;

-- Also try granting to the anon and authenticated roles (which authenticator
-- is a member of, but doesn't inherit from)
-- These already have USAGE, but let's make sure
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
