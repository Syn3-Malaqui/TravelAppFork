-- 🔧 AUTHENTICATION & PROFILE LOADING FIXES
-- Run this script in your Supabase SQL Editor to fix auth and profile issues

-- ========================================
-- 1. FIX RLS POLICIES FOR PROFILES ACCESS
-- ========================================

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Everyone can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.profiles;

-- Create comprehensive profile access policy
CREATE POLICY "Public can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);

-- Ensure authenticated users can also access profiles
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- 2. FIX PROFILE CREATION ON SIGNUP
-- ========================================

-- Update the profile creation function to handle all scenarios
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile with all required fields
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name, 
    bio,
    verified,
    role,
    followers_count,
    following_count,
    country
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    false, -- verified default
    'user'::user_role, -- role default
    0, -- followers_count default
    0, -- following_count default
    COALESCE(NEW.raw_user_meta_data->>'country', 'US')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================
-- 3. ENSURE ALL TABLES HAVE PROPER RLS
-- ========================================

-- Enable RLS on critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Ensure tweets are publicly viewable
DROP POLICY IF EXISTS "Public can view tweets" ON public.tweets;
CREATE POLICY "Public can view tweets"
ON public.tweets
FOR SELECT
TO public
USING (true);

-- Ensure authenticated users can view tweets
DROP POLICY IF EXISTS "Tweets are viewable by everyone" ON public.tweets;
CREATE POLICY "Authenticated users can view tweets"
ON public.tweets
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- 4. FIX FOREIGN KEY CONSTRAINTS
-- ========================================

-- Ensure profiles table has correct foreign key
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
DROP CONSTRAINT IF EXISTS profiles_id_fkey_auth;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey_auth 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- 5. CREATE DEBUGGING FUNCTIONS
-- ========================================

-- Function to check user profile status
CREATE OR REPLACE FUNCTION debug_user_profile(user_email text)
RETURNS TABLE (
  user_id uuid,
  email text,
  profile_exists boolean,
  username text,
  display_name text,
  role text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    (p.id IS NOT NULL) as profile_exists,
    p.username,
    p.display_name,
    p.role::text,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE au.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check RLS policies
CREATE OR REPLACE FUNCTION debug_rls_policies()
RETURNS TABLE (
  table_name text,
  policy_name text,
  policy_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    CASE 
      WHEN cmd = 'r' THEN 'SELECT'
      WHEN cmd = 'w' THEN 'INSERT'
      WHEN cmd = 'u' THEN 'UPDATE'
      WHEN cmd = 'd' THEN 'DELETE'
      ELSE cmd
    END as policy_type
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION debug_user_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_rls_policies() TO authenticated;

-- ========================================
-- 6. VERIFICATION QUERIES
-- ========================================

-- Check profile creation trigger
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies
SELECT schemaname, tablename, policyname, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check sample profiles
SELECT 
  p.username,
  p.display_name,
  p.role,
  p.verified,
  au.email,
  p.created_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC
LIMIT 5; 