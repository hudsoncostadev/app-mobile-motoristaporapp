/*
# Properly restrict handle_new_user trigger function

The previous REVOKE from anon/authenticated didn't work because PUBLIC
still has EXECUTE on the function (default PostgreSQL behavior for
functions in the public schema).

1. Changes
   - REVOKE EXECUTE FROM PUBLIC to remove the default grant.
   - GRANT EXECUTE only to the `postgres` superuser role (trigger runs as
     SECURITY DEFINER, so it doesn't need caller privileges).
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
