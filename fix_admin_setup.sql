-- Complete Admin Setup Script
-- Run this entire script in your Supabase SQL Editor

-- Step 1: Create the user_role enum type (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
        RAISE NOTICE 'Created user_role enum type';
    ELSE
        RAISE NOTICE 'user_role enum type already exists';
    END IF;
END $$;

-- Step 2: Add the role column to profiles table (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';
        RAISE NOTICE 'Added role column to profiles table';
    ELSE
        RAISE NOTICE 'role column already exists in profiles table';
    END IF;
END $$;

-- Step 3: Set all existing users to 'user' role by default
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;

-- Step 4: Set your specific account as admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT profiles.id 
  FROM public.profiles 
  JOIN auth.users ON profiles.id = auth.users.id 
  WHERE auth.users.email = 'archiejuniof@gmail.com'
);

-- Step 5: Also set admin for any user with username 'admin'
UPDATE public.profiles 
SET role = 'admin' 
WHERE username = 'admin';

-- Step 6: Create helper functions for role checking
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to manually set admin (for the frontend button)
CREATE OR REPLACE FUNCTION set_user_admin(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET role = 'admin' WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant permissions
GRANT USAGE ON TYPE user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_moderator_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_admin(uuid) TO authenticated;

-- Step 9: Verification - Check the results
SELECT 
  p.id,
  p.username, 
  p.display_name, 
  p.role,
  au.email,
  CASE 
    WHEN p.role = 'admin' THEN '👑 Admin'
    WHEN p.role = 'moderator' THEN '🛡️ Moderator' 
    ELSE '👤 User'
  END as role_display
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'archiejuniof@gmail.com' OR p.username = 'admin'
ORDER BY p.created_at DESC; 