/*
# Auto-confirm new signups

Email confirmation is enabled by default in this Supabase project, which
prevents new users from signing in until they click a confirmation link.
This trigger auto-confirms new users immediately at signup time so they
can log in right away.

1. Changes
   - Create `auto_confirm_new_user()` trigger function that sets
     `email_confirmed_at` before insert on auth.users.
   - Create a BEFORE INSERT trigger on auth.users.
*/

CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auth
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmation_token := NULL;
  NEW.confirmation_sent_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();
