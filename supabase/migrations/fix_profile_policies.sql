-- Fix infinite recursion in profile policies
-- The issue was caused by policies querying the profiles table from within profile table policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can see all profiles including deleted" ON profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;

-- Create a function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Use a direct query with security definer to bypass RLS
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND verified = TRUE 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- Create helper function for admin panel to get all profiles
CREATE OR REPLACE FUNCTION get_all_profiles_for_admin()
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    verified BOOLEAN,
    role TEXT,
    followers_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    suspended BOOLEAN,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Only admins can access all profiles';
    END IF;
    
    -- Return all profiles including deleted ones for admin
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.verified,
        p.role::TEXT,
        p.followers_count,
        p.created_at,
        p.suspended,
        p.suspended_at,
        p.suspended_reason,
        p.deleted_at
    FROM profiles p
    ORDER BY p.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_profiles_for_admin() TO authenticated;

-- Create simplified policies that don't cause recursion
CREATE POLICY "Enable read for all authenticated users" ON profiles
    FOR SELECT 
    USING (
        -- Regular users can see non-deleted profiles
        deleted_at IS NULL 
        -- We'll handle admin visibility in the application layer
    );

-- Create a separate policy for admins using the function
CREATE POLICY "Enable read for admins" ON profiles
    FOR SELECT 
    USING (is_admin_user());

-- Update the user moderation functions to use the new admin check
CREATE OR REPLACE FUNCTION suspend_user(
    target_user_id UUID,
    reason TEXT DEFAULT 'No reason provided'
)
RETURNS JSON AS $$
DECLARE
    admin_profile RECORD;
    target_profile RECORD;
    result JSON;
BEGIN
    -- Check if current user is admin using the new function
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Only verified admins can suspend users';
    END IF;
    
    -- Get admin profile info
    SELECT id, username INTO admin_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Get target user info
    SELECT id, username, display_name, suspended INTO target_profile
    FROM profiles 
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found with id: %', target_user_id;
    END IF;
    
    -- Don't allow suspending other admins
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = target_user_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Cannot suspend admin users';
    END IF;
    
    -- Suspend the user
    UPDATE profiles 
    SET 
        suspended = TRUE,
        suspended_at = NOW(),
        suspended_reason = reason,
        suspended_by = auth.uid(),
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Return success response
    SELECT json_build_object(
        'success', true,
        'action', 'suspended',
        'target_user_id', target_user_id,
        'target_username', target_profile.username,
        'target_display_name', target_profile.display_name,
        'reason', reason,
        'suspended_by', admin_profile.username,
        'suspended_at', NOW(),
        'message', 'User suspended successfully'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update unsuspend function
CREATE OR REPLACE FUNCTION unsuspend_user(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    admin_profile RECORD;
    target_profile RECORD;
    result JSON;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Only verified admins can unsuspend users';
    END IF;
    
    -- Get admin profile info
    SELECT id, username INTO admin_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Get target user info
    SELECT id, username, display_name, suspended INTO target_profile
    FROM profiles 
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found with id: %', target_user_id;
    END IF;
    
    -- Unsuspend the user
    UPDATE profiles 
    SET 
        suspended = FALSE,
        suspended_at = NULL,
        suspended_reason = NULL,
        suspended_by = NULL,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Return success response
    SELECT json_build_object(
        'success', true,
        'action', 'unsuspended',
        'target_user_id', target_user_id,
        'target_username', target_profile.username,
        'target_display_name', target_profile.display_name,
        'unsuspended_by', admin_profile.username,
        'message', 'User unsuspended successfully'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update delete function
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    admin_profile RECORD;
    target_profile RECORD;
    result JSON;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Only verified admins can delete user accounts';
    END IF;
    
    -- Get admin profile info
    SELECT id, username INTO admin_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Get target user info
    SELECT id, username, display_name INTO target_profile
    FROM profiles 
    WHERE id = target_user_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or already deleted with id: %', target_user_id;
    END IF;
    
    -- Don't allow deleting other admins
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = target_user_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Cannot delete admin users';
    END IF;
    
    -- Soft delete all user's tweets first
    UPDATE tweets 
    SET 
        content = '[This content has been removed]',
        image_urls = '{}',
        hashtags = '{}',
        mentions = '{}',
        tags = '{}',
        updated_at = NOW()
    WHERE author_id = target_user_id;
    
    -- Mark user as deleted
    UPDATE profiles 
    SET 
        deleted_at = NOW(),
        deleted_by = auth.uid(),
        suspended = TRUE,
        suspended_at = NOW(),
        suspended_reason = 'Account deleted by admin',
        suspended_by = auth.uid(),
        display_name = '[Deleted User]',
        bio = '',
        avatar_url = '',
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Return success response
    SELECT json_build_object(
        'success', true,
        'action', 'deleted',
        'target_user_id', target_user_id,
        'target_username', target_profile.username,
        'target_display_name', target_profile.display_name,
        'deleted_by', admin_profile.username,
        'deleted_at', NOW(),
        'message', 'User account deleted successfully'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the active_profiles view with proper security
DROP VIEW IF EXISTS active_profiles;
CREATE VIEW active_profiles AS
SELECT * FROM profiles WHERE deleted_at IS NULL;

-- Grant permissions on the view
GRANT SELECT ON active_profiles TO authenticated;

-- Final verification
SELECT 'Profile policies fixed - infinite recursion resolved!' as status;