-- Temporarily drop the handle_new_user trigger to test if it's causing the login error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
