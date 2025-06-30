-- User Moderation System - Suspend and Delete Users
-- This migration adds user suspension and soft-delete functionality for admins

-- Add moderation fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(suspended) WHERE suspended = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Function to suspend a user
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
    -- Check if current user is admin
    SELECT id, username, verified, role INTO admin_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    IF admin_profile.verified != TRUE OR (admin_profile.role != 'admin' AND admin_profile.username != 'admin') THEN
        RAISE EXCEPTION 'Only verified admins can suspend users';
    END IF;
    
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

-- Function to unsuspend a user
CREATE OR REPLACE FUNCTION unsuspend_user(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    admin_profile RECORD;
    target_profile RECORD;
    result JSON;
BEGIN
    -- Check if current user is admin
    SELECT id, username, verified, role INTO admin_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    IF admin_profile.verified != TRUE OR (admin_profile.role != 'admin' AND admin_profile.username != 'admin') THEN
        RAISE EXCEPTION 'Only verified admins can unsuspend users';
    END IF;
    
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

-- Function to soft delete a user (marks as deleted but keeps data)
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    admin_profile RECORD;
    target_profile RECORD;
    result JSON;
BEGIN
    -- Check if current user is admin
    SELECT id, username, verified, role INTO admin_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    IF admin_profile.verified != TRUE OR (admin_profile.role != 'admin' AND admin_profile.username != 'admin') THEN
        RAISE EXCEPTION 'Only verified admins can delete user accounts';
    END IF;
    
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

-- Function to get user moderation info
CREATE OR REPLACE FUNCTION get_user_moderation_info(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    user_info RECORD;
    result JSON;
BEGIN
    SELECT 
        id,
        username,
        display_name,
        suspended,
        suspended_at,
        suspended_reason,
        deleted_at,
        (SELECT username FROM profiles WHERE id = p.suspended_by) as suspended_by_username,
        (SELECT username FROM profiles WHERE id = p.deleted_by) as deleted_by_username
    INTO user_info
    FROM profiles p
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found with id: %', target_user_id;
    END IF;
    
    SELECT json_build_object(
        'user_id', user_info.id,
        'username', user_info.username,
        'display_name', user_info.display_name,
        'suspended', user_info.suspended,
        'suspended_at', user_info.suspended_at,
        'suspended_reason', user_info.suspended_reason,
        'suspended_by', user_info.suspended_by_username,
        'deleted_at', user_info.deleted_at,
        'deleted_by', user_info.deleted_by_username,
        'is_deleted', (user_info.deleted_at IS NOT NULL)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unsuspend_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_moderation_info(UUID) TO authenticated;

-- Update RLS policies to handle suspended/deleted users
-- Allow admins to see all profiles including deleted ones
CREATE POLICY "Admins can see all profiles including deleted" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles admin_p
            WHERE admin_p.id = auth.uid() 
            AND admin_p.verified = TRUE 
            AND (admin_p.username = 'admin' OR admin_p.role = 'admin')
        )
    );

-- Policy for regular users to only see non-deleted profiles
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
CREATE POLICY "Users can view public profiles" ON profiles
    FOR SELECT USING (
        deleted_at IS NULL
        OR 
        EXISTS (
            SELECT 1 FROM profiles admin_p
            WHERE admin_p.id = auth.uid() 
            AND admin_p.verified = TRUE 
            AND (admin_p.username = 'admin' OR admin_p.role = 'admin')
        )
    );

-- Create a view for active (non-deleted) profiles for easier queries
CREATE OR REPLACE VIEW active_profiles AS
SELECT * FROM profiles WHERE deleted_at IS NULL;

-- Grant permissions on the view
GRANT SELECT ON active_profiles TO authenticated; 