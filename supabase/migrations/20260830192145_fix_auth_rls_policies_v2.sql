/*
# Add permissive RLS policies on auth tables

RLS is enabled on auth tables with no policies, blocking the
authenticator role from seeing rows. Add permissive policies only
on tables we can modify (owned by supabase_auth_admin).

1. Changes
   - Add permissive FOR ALL policies for authenticator on key auth tables
*/

-- Users
CREATE POLICY "auth_users_all" ON auth.users
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- Instances
CREATE POLICY "auth_instances_all" ON auth.instances
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- Sessions
CREATE POLICY "auth_sessions_all" ON auth.sessions
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- Refresh tokens
CREATE POLICY "auth_refresh_tokens_all" ON auth.refresh_tokens
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- Identities
CREATE POLICY "auth_identities_all" ON auth.identities
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- Audit log
CREATE POLICY "auth_audit_log_all" ON auth.audit_log_entries
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- Flow state
CREATE POLICY "auth_flow_state_all" ON auth.flow_state
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- MFA
CREATE POLICY "auth_mfa_amr_all" ON auth.mfa_amr_claims
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

CREATE POLICY "auth_mfa_challenges_all" ON auth.mfa_challenges
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

CREATE POLICY "auth_mfa_factors_all" ON auth.mfa_factors
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- One time tokens
CREATE POLICY "auth_one_time_tokens_all" ON auth.one_time_tokens
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- SAML
CREATE POLICY "auth_saml_providers_all" ON auth.saml_providers
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

CREATE POLICY "auth_saml_relay_states_all" ON auth.saml_relay_states
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

-- SSO
CREATE POLICY "auth_sso_domains_all" ON auth.sso_domains
  FOR ALL TO authenticator USING (true) WITH CHECK (true);

CREATE POLICY "auth_sso_providers_all" ON auth.sso_providers
  FOR ALL TO authenticator USING (true) WITH CHECK (true);
