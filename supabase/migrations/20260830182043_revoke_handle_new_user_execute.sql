/*
# Revoke public execute on handle_new_user trigger function

The `handle_new_user()` function is a SECURITY DEFINER trigger that fires
automatically when a new auth user is created. It should NOT be callable
via the REST API by anon or authenticated roles.

1. Changes
   - REVOKE EXECUTE on `public.handle_new_user()` from `anon` and `authenticated`.
   - The trigger still works because it runs with the function's SECURITY DEFINER
     privileges internally, not via the API.

2. Security
   - Prevents any client from calling `handle_new_user()` via /rest/v1/rpc.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
