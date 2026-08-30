-- Drop the auto_confirm trigger - it might interfere with Supabase Auth's
-- internal flow by clearing the confirmation_token before the auth service
-- can use it. Instead, we'll auto-confirm users in the handle_new_user
-- function itself.
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_new_user() CASCADE;
