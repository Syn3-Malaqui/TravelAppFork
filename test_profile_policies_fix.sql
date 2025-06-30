-- Test script to verify profile policies fix
-- This checks that the infinite recursion issue is resolved

-- Check if admin function works
SELECT 'Testing is_admin_user function...' as test_step;
SELECT is_admin_user() as is_admin_result;

-- Test if we can query profiles without recursion
SELECT 'Testing basic profile query...' as test_step;
SELECT COUNT(*) as total_profiles FROM profiles;

-- Test if admin can see all profiles
SELECT 'Testing admin profile access...' as test_step;
SELECT get_all_profiles_for_admin() LIMIT 5;

-- Test active profiles view
SELECT 'Testing active_profiles view...' as test_step;
SELECT COUNT(*) as active_profiles FROM active_profiles;

-- Check current policies
SELECT 'Current policies on profiles table:' as test_step;
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- Test profile creation (should work without recursion)
SELECT 'Testing profile operations...' as test_step;
SELECT 
    username, 
    verified, 
    role,
    suspended,
    deleted_at IS NOT NULL as is_deleted
FROM profiles 
WHERE id = auth.uid();

SELECT '✅ All tests completed - recursion issue should be fixed!' as result; 