-- Comprehensive queries to check all pinned tweets in the system

-- 1. Check all tweets pinned to user profiles
SELECT 
    t.id as tweet_id,
    t.content,
    p.username,
    p.display_name,
    t.pinned_at,
    t.created_at as tweet_created_at,
    t.likes_count,
    t.retweets_count,
    t.replies_count
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE t.pinned_to_profile = TRUE
ORDER BY t.pinned_at DESC;

-- 2. Check all tweets pinned to home timeline (admin pins)
SELECT 
    t.id as tweet_id,
    t.content,
    p.username as author_username,
    p.display_name as author_name,
    p.verified as author_verified,
    t.pinned_at,
    t.created_at as tweet_created_at,
    t.likes_count,
    t.retweets_count,
    t.replies_count
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE t.pinned_to_home = TRUE
ORDER BY t.pinned_at DESC;

-- 3. Summary of pinned tweets by user
SELECT 
    p.username,
    p.display_name,
    COUNT(t.id) as pinned_tweets_count,
    MAX(t.pinned_at) as latest_pin_date
FROM profiles p
LEFT JOIN tweets t ON p.id = t.author_id AND t.pinned_to_profile = TRUE
GROUP BY p.id, p.username, p.display_name
HAVING COUNT(t.id) > 0
ORDER BY pinned_tweets_count DESC, latest_pin_date DESC;

-- 4. Check for users with multiple pinned tweets (should be 0 - only 1 allowed per user)
SELECT 
    p.username,
    p.display_name,
    COUNT(t.id) as pinned_count,
    ARRAY_AGG(t.id) as tweet_ids,
    ARRAY_AGG(t.pinned_at) as pin_dates
FROM profiles p
JOIN tweets t ON p.id = t.author_id
WHERE t.pinned_to_profile = TRUE
GROUP BY p.id, p.username, p.display_name
HAVING COUNT(t.id) > 1;

-- 5. Check for multiple home-pinned tweets (should be 0 - only 1 allowed globally)
SELECT 
    COUNT(*) as home_pinned_count,
    ARRAY_AGG(t.id) as tweet_ids,
    ARRAY_AGG(p.username) as authors,
    ARRAY_AGG(t.pinned_at) as pin_dates
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE t.pinned_to_home = TRUE;

-- 6. Detailed view of all pinned tweets with full context
SELECT 
    t.id as tweet_id,
    t.content,
    p.username,
    p.display_name,
    p.verified,
    CASE 
        WHEN t.pinned_to_profile AND t.pinned_to_home THEN 'Both Profile & Home'
        WHEN t.pinned_to_profile THEN 'Profile Only'
        WHEN t.pinned_to_home THEN 'Home Only'
        ELSE 'Not Pinned'
    END as pin_type,
    t.pinned_at,
    t.created_at as tweet_created_at,
    t.likes_count,
    t.retweets_count,
    t.replies_count,
    t.views_count,
    CASE 
        WHEN t.image_urls IS NOT NULL AND array_length(t.image_urls, 1) > 0 
        THEN array_length(t.image_urls, 1) 
        ELSE 0 
    END as image_count,
    t.hashtags,
    t.tags
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE t.pinned_to_profile = TRUE OR t.pinned_to_home = TRUE
ORDER BY 
    CASE WHEN t.pinned_to_home THEN 1 ELSE 2 END,
    t.pinned_at DESC;

-- 7. Check admin users who can pin to home timeline
SELECT 
    p.id,
    p.username,
    p.display_name,
    p.verified,
    p.role,
    p.created_at
FROM profiles p
WHERE p.verified = TRUE 
AND (p.username = 'admin' OR p.role = 'admin')
ORDER BY p.created_at;

-- 8. Recent pinning activity (last 30 days)
SELECT 
    t.id as tweet_id,
    SUBSTRING(t.content, 1, 100) || CASE WHEN LENGTH(t.content) > 100 THEN '...' ELSE '' END as content_preview,
    p.username,
    CASE 
        WHEN t.pinned_to_profile AND t.pinned_to_home THEN 'Both'
        WHEN t.pinned_to_profile THEN 'Profile'
        WHEN t.pinned_to_home THEN 'Home'
    END as pin_location,
    t.pinned_at,
    AGE(NOW(), t.pinned_at) as time_since_pinned
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE (t.pinned_to_profile = TRUE OR t.pinned_to_home = TRUE)
AND t.pinned_at >= NOW() - INTERVAL '30 days'
ORDER BY t.pinned_at DESC;

-- 9. Performance check - tweets with pinned status and their engagement
SELECT 
    CASE 
        WHEN t.pinned_to_home THEN 'Home Pinned'
        WHEN t.pinned_to_profile THEN 'Profile Pinned'
        ELSE 'Regular'
    END as tweet_type,
    COUNT(*) as tweet_count,
    AVG(t.likes_count) as avg_likes,
    AVG(t.retweets_count) as avg_retweets,
    AVG(t.replies_count) as avg_replies,
    AVG(t.views_count) as avg_views
FROM tweets t
WHERE t.pinned_to_profile = TRUE OR t.pinned_to_home = TRUE
GROUP BY 
    CASE 
        WHEN t.pinned_to_home THEN 'Home Pinned'
        WHEN t.pinned_to_profile THEN 'Profile Pinned'
        ELSE 'Regular'
    END
ORDER BY avg_likes DESC;

-- 10. Quick status check
SELECT 
    'Profile Pins' as pin_type,
    COUNT(*) as total_count
FROM tweets 
WHERE pinned_to_profile = TRUE

UNION ALL

SELECT 
    'Home Pins' as pin_type,
    COUNT(*) as total_count
FROM tweets 
WHERE pinned_to_home = TRUE

UNION ALL

SELECT 
    'Total Tweets' as pin_type,
    COUNT(*) as total_count
FROM tweets; 