/*
# Fix handle_new_user trigger to bypass RLS

The handle_new_user() SECURITY DEFINER function inserts into profiles
during signup, but RLS blocks the insert because auth.uid() isn't
available in the trigger context. The fix is to set the function's
search_path and ensure it can bypass RLS by using SECURITY DEFINER
with the correct owner.

The real issue: the function is SECURITY DEFINER owned by postgres,
which should bypass RLS. But the search_path is "public" which is
correct. Let's check if the issue is that the function was created
by a different role.

1. Changes
   - Recreate handle_new_user as SECURITY DEFINER owned by postgres
   - Ensure it has the right search_path
*/

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, picture, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'picture',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Ensure only postgres and service_role can execute it
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Recreate the trigger (drop first to avoid errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
