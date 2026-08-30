-- Revoke EXECUTE on the auto_confirm_new_user function from anon and authenticated
-- so it can only be called by the database internally (via the trigger).
REVOKE EXECUTE ON FUNCTION public.auto_confirm_new_user() FROM anon, authenticated;
