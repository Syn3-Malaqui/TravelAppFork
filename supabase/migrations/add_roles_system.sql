-- Add roles system to the database
-- Run these queries in your Supabase SQL editor

-- 1. Create role enum type
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

-- 2. Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role user_role DEFAULT 'user';

-- 3. Create function to automatically set admin role for specific email
CREATE OR REPLACE FUNCTION set_admin_role()
RETURNS trigger AS $$
BEGIN
  -- Check if the user's email is the admin email
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = NEW.id 
    AND email = 'archiejuniof@gmail.com'
  ) THEN
    NEW.role = 'admin';
  ELSE
    NEW.role = 'user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to automatically assign roles on profile creation
CREATE TRIGGER trigger_set_user_role
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_role();

-- 5. Update existing profiles to set roles
-- First, set everyone to 'user' by default
UPDATE public.profiles SET role = 'user';

-- Then set the admin user (if they already exist)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT profiles.id 
  FROM public.profiles 
  JOIN auth.users ON profiles.id = auth.users.id 
  WHERE auth.users.email = 'archiejuniof@gmail.com'
);

-- 6. Create Row Level Security policies for role-based access

-- Allow users to read their own role
CREATE POLICY "Users can view their own role" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to read public profile info (including roles for display)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Only allow users to update their own profile (but not their role)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Only admins can update any user's role
CREATE POLICY "Admins can update user roles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Create helper functions for role checking

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is moderator or admin
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create admin panel access policies (example for tweets table)
-- Admins and moderators can delete any tweet
CREATE POLICY "Admins and moderators can delete any tweet" ON public.tweets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- 9. Grant necessary permissions
GRANT USAGE ON TYPE user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_moderator_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated; 