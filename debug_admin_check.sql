-- Debug queries to check admin setup
-- Run these queries in your Supabase SQL Editor to debug the issue

-- 1. Check if the role column exists and what roles are available
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- 2. Check if the user_role enum exists
SELECT enumlabel as available_roles 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'user_role';

-- 3. Find your specific user profile by email
SELECT p.id, p.username, p.display_name, p.role, au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'archiejuniof@gmail.com';

-- 4. Check all profiles with their roles (to see the current state)
SELECT p.username, p.display_name, p.role, au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 5. If the role column doesn't exist, add it:
-- ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';

-- 6. If your user doesn't have admin role, manually set it:
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE id IN (
--   SELECT profiles.id 
--   FROM public.profiles 
--   JOIN auth.users ON profiles.id = auth.users.id 
--   WHERE auth.users.email = 'archiejuniof@gmail.com'
-- ); 