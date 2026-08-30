/*
# Create DriverBank core tables

1. Purpose
   DriverBank is a multi-user app where each motorista (ride-hailing driver)
   tracks daily earnings, expenses, and monthly income goals. Users must sign
   in (email + password), and every row is scoped to its owner.

2. New Tables

   a) `profiles`
      - Extends `auth.users` with app-specific data: display name, vehicle, avatar URL.
      - `id` (uuid, PK) → references `auth.users(id)` with CASCADE delete.
      - `name` (text) — display name shown in the app.
      - `picture` (text, nullable) — avatar URL.
      - `vehicle` (text, nullable) — vehicle description (e.g. "Onix 2020 - ABC1D23").
      - `created_at` (timestamptz, default now()).

   b) `workdays`
      - One row per work session per user.
      - `id` (uuid, PK, default gen_random_uuid).
      - `user_id` (uuid, NOT NULL, default auth.uid()) → references auth.users(id) ON DELETE CASCADE.
      - `day_key` (date, NOT NULL) — the calendar day (YYYY-MM-DD) this workday belongs to.
      - `status` (text, NOT NULL, CHECK in 'active','closed') — whether the day is in progress or finished.
      - `started_at` (timestamptz, nullable) — when the driver started working.
      - `ended_at` (timestamptz, nullable) — when the driver closed the day.
      - `hours` (numeric, default 0) — total hours worked (computed on close).
      - `km` (numeric, default 0) — kilometers driven.
      - `bruto` (numeric, default 0) — gross earnings.
      - `liquido` (numeric, default 0) — net earnings (bruto minus expenses).
      - `gastos_total` (numeric, default 0) — total expenses.
      - `rides_total` (integer, default 0) — number of rides.
      - `apps` (jsonb, nullable) — array of {platform, amount, rides} per app (Uber, 99, etc).
      - `expenses` (jsonb, nullable) — object with abastecimento, alimentacao, manutencao, outros.
      - `deleted_at` (timestamptz, nullable) — soft-delete timestamp (for cancelled active days).
      - `created_at` (timestamptz, default now()).
      - Indexes on (user_id, status) and (user_id, day_key) for fast lookups.

   c) `goal_settings`
      - One row per user (their monthly target configuration).
      - `user_id` (uuid, PK) → references auth.users(id) ON DELETE CASCADE.
      - `monthly_target` (numeric, NOT NULL) — target gross income for the month.
      - `days_per_week` (integer, NOT NULL, CHECK 1–7) — how many days per week the driver works.
      - `updated_at` (timestamptz, default now()).

3. Security (RLS)
   - RLS enabled on ALL three tables.
   - `profiles`: user can SELECT and UPDATE only their own row (auth.uid() = id).
     INSERT is handled automatically via a trigger when a new auth user is created,
     so no direct INSERT policy is needed for the app; a policy is still provided
     so the client can insert if needed.
   - `workdays`: full CRUD scoped to auth.uid() = user_id.
   - `goal_settings`: full CRUD scoped to auth.uid() = user_id.
   - All policies use `TO authenticated` because the app requires sign-in.

4. Trigger
   - `handle_new_user` trigger: when a new row is inserted into `auth.users`,
     automatically creates a matching `profiles` row with the user's email and name
     from auth metadata. This ensures every signed-up user has a profile.

5. Important Notes
   - `user_id` columns default to `auth.uid()` so client inserts that omit
     `user_id` still satisfy the INSERT WITH CHECK policy.
   - Soft-delete pattern on `workdays` (deleted_at) instead of hard DELETE,
     to preserve history.
   - `apps` and `expenses` stored as JSONB for flexibility.
*/

-- ===================== PROFILES =====================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text   NOT NULL DEFAULT '',
  picture     text,
  vehicle     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ===================== WORKDAYS =====================
CREATE TABLE IF NOT EXISTS workdays (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key      date NOT NULL,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_at   timestamptz,
  ended_at     timestamptz,
  hours        numeric NOT NULL DEFAULT 0,
  km           numeric NOT NULL DEFAULT 0,
  bruto        numeric NOT NULL DEFAULT 0,
  liquido      numeric NOT NULL DEFAULT 0,
  gastos_total numeric NOT NULL DEFAULT 0,
  rides_total  integer NOT NULL DEFAULT 0,
  apps         jsonb,
  expenses     jsonb,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workdays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workdays" ON workdays;
CREATE POLICY "select_own_workdays"
  ON workdays FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workdays" ON workdays;
CREATE POLICY "insert_own_workdays"
  ON workdays FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workdays" ON workdays;
CREATE POLICY "update_own_workdays"
  ON workdays FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workdays" ON workdays;
CREATE POLICY "delete_own_workdays"
  ON workdays FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workdays_user_status ON workdays(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workdays_user_day ON workdays(user_id, day_key);

-- ===================== GOAL_SETTINGS =====================
CREATE TABLE IF NOT EXISTS goal_settings (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_target numeric NOT NULL,
  days_per_week  integer NOT NULL CHECK (days_per_week >= 1 AND days_per_week <= 7),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_goals" ON goal_settings;
CREATE POLICY "select_own_goals"
  ON goal_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_goals" ON goal_settings;
CREATE POLICY "insert_own_goals"
  ON goal_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_goals" ON goal_settings;
CREATE POLICY "update_own_goals"
  ON goal_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_goals" ON goal_settings;
CREATE POLICY "delete_own_goals"
  ON goal_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===================== AUTO-PROFILE TRIGGER =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, picture)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'picture'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
