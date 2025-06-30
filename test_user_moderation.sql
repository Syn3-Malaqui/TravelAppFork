-- Test script for user moderation system
-- This script tests suspend, unsuspend, and delete functionality

-- Check admin status
SELECT 'Checking admin status...' as test_step;
SELECT 
    username,
    role,
    verified,
    CASE 
        WHEN verified = TRUE AND role = 'admin' THEN '✅ Admin access confirmed'
        ELSE '❌ Admin access required'
    END as admin_status
FROM profiles 
WHERE id = auth.uid();

-- List all users (non-admins only for testing)
SELECT 'Finding test users (non-admins)...' as test_step;
SELECT 
    id,
    username,
    display_name,
    role,
    suspended,
    suspended_reason,
    deleted_at IS NOT NULL as is_deleted
FROM profiles 
WHERE role != 'admin' 
AND username != 'admin'
ORDER BY created_at DESC
LIMIT 5;

-- Test get user moderation info function
SELECT 'Testing get_user_moderation_info function...' as test_step;
SELECT get_user_moderation_info(
    (SELECT id FROM profiles WHERE role != 'admin' AND username != 'admin' LIMIT 1)
);

-- Example: Suspend a user (replace with actual user ID)
-- Uncomment and replace with actual user ID to test:
/*
SELECT 'Testing suspend_user function...' as test_step;
SELECT suspend_user(
    'USER_ID_HERE',
    'Testing suspension functionality'
);
*/

-- Example: Unsuspend a user
/*
SELECT 'Testing unsuspend_user function...' as test_step;
SELECT unsuspend_user('USER_ID_HERE');
*/

-- Example: Delete a user account
/*
SELECT 'Testing delete_user_account function...' as test_step;
SELECT delete_user_account('USER_ID_HERE');
*/

-- Check moderation logs
SELECT 'Recent moderation actions...' as test_step;
SELECT 
    p.username,
    p.display_name,
    p.suspended,
    p.suspended_at,
    p.suspended_reason,
    p.deleted_at IS NOT NULL as is_deleted,
    suspended_by_admin.username as suspended_by,
    deleted_by_admin.username as deleted_by
FROM profiles p
LEFT JOIN profiles suspended_by_admin ON p.suspended_by = suspended_by_admin.id
LEFT JOIN profiles deleted_by_admin ON p.deleted_by = deleted_by_admin.id
WHERE p.suspended = TRUE OR p.deleted_at IS NOT NULL
ORDER BY COALESCE(p.suspended_at, p.deleted_at) DESC
LIMIT 10;

-- Test profile policies (check if admins can see all profiles)
SELECT 'Testing profile visibility policies...' as test_step;
SELECT 
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE suspended = TRUE) as suspended_profiles,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_profiles,
    COUNT(*) FILTER (WHERE suspended = FALSE AND deleted_at IS NULL) as active_profiles
FROM profiles;

-- Test active_profiles view
SELECT 'Testing active_profiles view...' as test_step;
SELECT COUNT(*) as active_profiles_count FROM active_profiles;

SELECT '🎉 User moderation system test completed!' as test_step; 