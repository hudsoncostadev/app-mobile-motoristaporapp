/*
# Add email column to profiles

The profiles table was created without an `email` column because the
trigger only copied `name` and `picture` from auth.users metadata. The
frontend needs `email` to display the user's email in the profile screen.

1. Changes
   - Add `email` text column to `profiles` (nullable).
   - Update the trigger function to also copy email from auth.users.

2. Backfill
   - Set email for existing profiles from auth.users.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

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
