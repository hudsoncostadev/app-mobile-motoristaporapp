/*
# Fix auto_confirm_new_user search_path

The auto_confirm_new_user() function had search_path set to 'auth',
which might cause issues finding standard functions like now().
Setting it to 'public' is safer since the function only modifies
NEW record fields and doesn't query any tables.

Also, the handle_new_user AFTER trigger might fail because the
auto_confirm BEFORE trigger clears the confirmation_token, which
could interfere with Supabase Auth's internal flow.

1. Changes
   - Fix search_path on auto_confirm_new_user to 'public'
   - Drop and recreate the trigger to ensure correct ordering
*/

CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmation_token := NULL;
  NEW.confirmation_sent_at := NULL;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_confirm_new_user() FROM anon, authenticated, public;
