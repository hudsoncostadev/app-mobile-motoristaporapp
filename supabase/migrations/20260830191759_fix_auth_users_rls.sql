/*
# Fix auth.users RLS

RLS is enabled on auth.users with no policies, blocking the authenticator
role (used by Supabase Auth) from accessing the table. Since we can't
grant BYPASSRLS to the reserved authenticator role, we need to either
disable RLS or add a permissive policy.

1. Changes
   - Add a permissive policy for authenticator on auth.users
*/

-- Add permissive policies for the authenticator role on auth.users
CREATE POLICY "auth_users_all_authenticator" ON auth.users
  FOR ALL TO authenticator
  USING (true) WITH CHECK (true);
