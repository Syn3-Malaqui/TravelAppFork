-- 🔍 COMPREHENSIVE USER INFO QUERIES
-- Copy and paste these queries in your Supabase SQL Editor

-- ========================================
-- 1. COMPLETE USER OVERVIEW (Most Useful)
-- ========================================
SELECT 
  p.id,
  p.username,
  p.display_name,
  au.email,
  p.role,
  p.verified,
  p.bio,
  p.followers_count,
  p.following_count,
  p.country,
  p.created_at as profile_created,
  au.created_at as account_created,
  au.last_sign_in_at,
  au.email_confirmed_at,
  CASE 
    WHEN p.role = 'admin' THEN '👑 Admin'
    WHEN p.role = 'moderator' THEN '🛡️ Moderator' 
    ELSE '👤 User'
  END as role_display,
  CASE 
    WHEN p.verified THEN '✅ Verified'
    ELSE '❌ Not Verified'
  END as verification_status,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '❌ Email Not Confirmed'
  END as email_status,
  CASE 
    WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN '🟢 Active (Last 7 days)'
    WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN '🟡 Recent (Last 30 days)'
    WHEN au.last_sign_in_at IS NOT NULL THEN '🔴 Inactive (30+ days)'
    ELSE '⚪ Never Signed In'
  END as activity_status
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- ========================================
-- 2. ADMIN & MODERATOR USERS ONLY
-- ========================================
SELECT 
  p.username,
  p.display_name,
  au.email,
  p.role,
  p.verified,
  p.followers_count,
  au.last_sign_in_at,
  CASE 
    WHEN p.role = 'admin' THEN '👑 Admin'
    WHEN p.role = 'moderator' THEN '🛡️ Moderator'
  END as role_display
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.role IN ('admin', 'moderator')
ORDER BY 
  CASE 
    WHEN p.role = 'admin' THEN 1
    WHEN p.role = 'moderator' THEN 2
  END,
  p.created_at DESC;

-- ========================================
-- 3. VERIFIED USERS ONLY
-- ========================================
SELECT 
  p.username,
  p.display_name,
  au.email,
  p.role,
  p.followers_count,
  p.following_count,
  p.created_at,
  '✅ Verified' as status
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.verified = true
ORDER BY p.followers_count DESC;

-- ========================================
-- 4. USER STATISTICS SUMMARY
-- ========================================
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Verified Users',
  COUNT(*) 
FROM profiles WHERE verified = true
UNION ALL
SELECT 
  'Admin Users',
  COUNT(*) 
FROM profiles WHERE role = 'admin'
UNION ALL
SELECT 
  'Moderator Users',
  COUNT(*) 
FROM profiles WHERE role = 'moderator'
UNION ALL
SELECT 
  'Regular Users',
  COUNT(*) 
FROM profiles WHERE role = 'user'
UNION ALL
SELECT 
  'Users with Email Confirmed',
  COUNT(*) 
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email_confirmed_at IS NOT NULL
UNION ALL
SELECT 
  'Active Users (Last 7 days)',
  COUNT(*) 
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.last_sign_in_at > NOW() - INTERVAL '7 days';

-- ========================================
-- 5. USERS BY COUNTRY (If you have country data)
-- ========================================
SELECT 
  p.country,
  COUNT(*) as user_count,
  COUNT(CASE WHEN p.verified THEN 1 END) as verified_count,
  COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN p.role = 'moderator' THEN 1 END) as moderator_count
FROM profiles p
WHERE p.country IS NOT NULL
GROUP BY p.country
ORDER BY user_count DESC;

-- ========================================
-- 6. RECENT SIGNUPS (Last 30 days)
-- ========================================
SELECT 
  p.username,
  p.display_name,
  au.email,
  p.role,
  p.verified,
  p.created_at as signed_up,
  au.last_sign_in_at,
  CASE 
    WHEN p.verified THEN '✅'
    ELSE '❌'
  END as verified_status
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.created_at > NOW() - INTERVAL '30 days'
ORDER BY p.created_at DESC;

-- ========================================
-- 7. INACTIVE USERS (Haven't signed in recently)
-- ========================================
SELECT 
  p.username,
  p.display_name,
  au.email,
  p.role,
  au.last_sign_in_at,
  p.created_at,
  CASE 
    WHEN au.last_sign_in_at IS NULL THEN 'Never signed in'
    ELSE EXTRACT(days FROM NOW() - au.last_sign_in_at)::text || ' days ago'
  END as last_activity
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.last_sign_in_at < NOW() - INTERVAL '30 days' 
   OR au.last_sign_in_at IS NULL
ORDER BY au.last_sign_in_at ASC NULLS FIRST;

-- ========================================
-- 8. TOP USERS BY FOLLOWERS
-- ========================================
SELECT 
  p.username,
  p.display_name,
  p.role,
  p.verified,
  p.followers_count,
  p.following_count,
  CASE 
    WHEN p.verified THEN '✅'
    ELSE '❌'
  END as verified_status,
  CASE 
    WHEN p.role = 'admin' THEN '👑'
    WHEN p.role = 'moderator' THEN '🛡️'
    ELSE '👤'
  END as role_icon
FROM profiles p
WHERE p.followers_count > 0
ORDER BY p.followers_count DESC
LIMIT 20;

-- ========================================
-- 9. SEARCH SPECIFIC USER (Replace 'username_here')
-- ========================================
SELECT 
  p.id,
  p.username,
  p.display_name,
  au.email,
  p.role,
  p.verified,
  p.bio,
  p.avatar_url,
  p.cover_image,
  p.followers_count,
  p.following_count,
  p.country,
  p.created_at as profile_created,
  au.created_at as account_created,
  au.last_sign_in_at,
  au.email_confirmed_at,
  au.phone_confirmed_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.username = 'username_here'  -- Replace with actual username
   OR au.email = 'email_here'       -- Replace with actual email
   OR p.display_name ILIKE '%search_term%'; -- Replace with search term

-- ========================================
-- 10. ROLE CHANGE AUDIT (Check who has admin/mod roles)
-- ========================================
SELECT 
  p.username,
  p.display_name,
  au.email,
  p.role,
  p.verified,
  p.updated_at as last_profile_update,
  au.updated_at as last_auth_update,
  CASE 
    WHEN p.role = 'admin' THEN '👑 ADMIN - Full Access'
    WHEN p.role = 'moderator' THEN '🛡️ MODERATOR - Can moderate content'
    ELSE '👤 USER - Regular user'
  END as permissions
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.role IN ('admin', 'moderator')
ORDER BY 
  CASE 
    WHEN p.role = 'admin' THEN 1
    WHEN p.role = 'moderator' THEN 2
  END,
  p.updated_at DESC; 