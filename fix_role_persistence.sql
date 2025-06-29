-- Fix Role Persistence Issues
-- Run this script in your Supabase SQL Editor to fix role updates not persisting

-- Step 1: Ensure the user_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
        RAISE NOTICE 'Created user_role enum type';
    ELSE
        RAISE NOTICE 'user_role enum type already exists';
    END IF;
END $$;

-- Step 2: Add the role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';
        RAISE NOTICE 'Added role column to profiles table';
    ELSE
        RAISE NOTICE 'role column already exists in profiles table';    
    END IF;
END $$;

-- Step 3: Migrate data from is_admin to role column (if is_admin exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
        -- Update users with is_admin = true to have role = 'admin'
        UPDATE public.profiles SET role = 'admin' WHERE is_admin = true;
        RAISE NOTICE 'Migrated is_admin data to role column';
    END IF;
END $$;

-- Step 4: Set default values for any NULL roles
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;

-- Step 5: Set specific admin user
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT profiles.id 
  FROM public.profiles 
  JOIN auth.users ON profiles.id = auth.users.id 
  WHERE auth.users.email = 'archiejuniof@gmail.com'
);

-- Step 6: Drop ALL existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Step 7: Create clean, comprehensive RLS policies
-- Allow everyone to view all profiles (including roles for display)
CREATE POLICY "Everyone can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile (excluding role and verification)
CREATE POLICY "Users can update own profile data"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing their own role or verification status
  role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
  verified = (SELECT verified FROM public.profiles WHERE id = auth.uid())
);

-- Allow admins to update ANY profile (including roles and verification)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Step 8: Create/update helper functions
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

-- Step 9: Grant necessary permissions
GRANT USAGE ON TYPE user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_moderator_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Step 10: Add indexes for performance
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Step 11: Verification query
SELECT 
  p.id,
  p.username, 
  p.display_name, 
  p.role,
  p.verified,
  au.email,
  CASE 
    WHEN p.role = 'admin' THEN '👑 Admin'
    WHEN p.role = 'moderator' THEN '🛡️ Moderator' 
    ELSE '👤 User'
  END as role_display
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC
LIMIT 10; 