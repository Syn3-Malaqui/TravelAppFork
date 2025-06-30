-- Comprehensive fix for pinning system issues
-- Run this in your Supabase SQL Editor

-- 1. First, let's check your current admin status
SELECT 
    p.id,
    p.username,
    p.display_name,
    p.verified,
    p.role,
    au.email,
    CASE 
        WHEN p.verified = TRUE AND (p.username = 'admin' OR p.role = 'admin') THEN 'Can pin to home'
        WHEN p.verified = TRUE THEN 'Verified but not admin'
        WHEN p.role = 'admin' THEN 'Admin but not verified'
        ELSE 'Regular user'
    END as pin_status
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'archiejuniof@gmail.com'
   OR p.username = 'admin'
   OR p.role = 'admin'
ORDER BY p.created_at DESC;

-- 2. Fix: Make sure you are both verified AND admin
UPDATE profiles 
SET verified = TRUE, role = 'admin'
WHERE id IN (
    SELECT p.id 
    FROM profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE au.email = 'archiejuniof@gmail.com'
);

-- 3. Fix the database functions to be more robust
DROP FUNCTION IF EXISTS pin_tweet_to_home(UUID);
DROP FUNCTION IF EXISTS unpin_tweet_from_home(UUID);
DROP FUNCTION IF EXISTS pin_tweet_to_profile(UUID);
DROP FUNCTION IF EXISTS unpin_tweet_from_profile(UUID);

-- 4. Create improved pin_tweet_to_profile function
CREATE OR REPLACE FUNCTION pin_tweet_to_profile(tweet_id UUID)
RETURNS JSON AS $$
DECLARE
    tweet_author_id UUID;
    result JSON;
BEGIN
    -- Get the tweet's author and verify ownership
    SELECT author_id INTO tweet_author_id FROM tweets WHERE id = tweet_id;
    
    IF tweet_author_id IS NULL THEN
        RAISE EXCEPTION 'Tweet not found with id: %', tweet_id;
    END IF;
    
    IF tweet_author_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only pin your own tweets. Tweet belongs to: %, your id: %', tweet_author_id, auth.uid();
    END IF;
    
    -- First unpin any existing pinned tweet for this user
    UPDATE tweets 
    SET pinned_to_profile = FALSE, pinned_at = NULL
    WHERE author_id = auth.uid()
    AND pinned_to_profile = TRUE;
    
    -- Pin the specified tweet
    UPDATE tweets 
    SET pinned_to_profile = TRUE, pinned_at = NOW()
    WHERE id = tweet_id;
    
    -- Return success with details
    SELECT json_build_object(
        'success', true,
        'tweet_id', tweet_id,
        'pinned_at', NOW(),
        'message', 'Tweet pinned to profile successfully'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create improved unpin_tweet_from_profile function
CREATE OR REPLACE FUNCTION unpin_tweet_from_profile(tweet_id UUID)
RETURNS JSON AS $$
DECLARE
    tweet_author_id UUID;
    result JSON;
BEGIN
    -- Get the tweet's author and verify ownership
    SELECT author_id INTO tweet_author_id FROM tweets WHERE id = tweet_id;
    
    IF tweet_author_id IS NULL THEN
        RAISE EXCEPTION 'Tweet not found with id: %', tweet_id;
    END IF;
    
    IF tweet_author_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only unpin your own tweets';
    END IF;
    
    UPDATE tweets 
    SET pinned_to_profile = FALSE, pinned_at = NULL
    WHERE id = tweet_id;
    
    -- Return success with details
    SELECT json_build_object(
        'success', true,
        'tweet_id', tweet_id,
        'message', 'Tweet unpinned from profile successfully'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create improved pin_tweet_to_home function with better admin checking
CREATE OR REPLACE FUNCTION pin_tweet_to_home(tweet_id UUID)
RETURNS JSON AS $$
DECLARE
    user_profile RECORD;
    result JSON;
BEGIN
    -- Get current user profile with detailed info
    SELECT id, username, verified, role INTO user_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Debug: Log the user's current status
    RAISE NOTICE 'User attempting home pin - ID: %, Username: %, Verified: %, Role: %', 
        user_profile.id, user_profile.username, user_profile.verified, user_profile.role;
    
    -- Check if user is verified admin (must be BOTH verified AND admin)
    IF user_profile.verified != TRUE THEN
        RAISE EXCEPTION 'User is not verified. Current status: verified=%, role=%', user_profile.verified, user_profile.role;
    END IF;
    
    IF user_profile.role != 'admin' AND user_profile.username != 'admin' THEN
        RAISE EXCEPTION 'User is not admin. Current status: verified=%, role=%, username=%', 
            user_profile.verified, user_profile.role, user_profile.username;
    END IF;
    
    -- Verify tweet exists
    IF NOT EXISTS (SELECT 1 FROM tweets WHERE id = tweet_id) THEN
        RAISE EXCEPTION 'Tweet not found with id: %', tweet_id;
    END IF;
    
    -- Unpin any existing home-pinned tweets (only one at a time)
    UPDATE tweets 
    SET pinned_to_home = FALSE, pinned_at = NULL
    WHERE pinned_to_home = TRUE;
    
    -- Pin the specified tweet
    UPDATE tweets 
    SET pinned_to_home = TRUE, pinned_at = NOW()
    WHERE id = tweet_id;
    
    -- Return success with details
    SELECT json_build_object(
        'success', true,
        'tweet_id', tweet_id,
        'pinned_at', NOW(),
        'admin_user', user_profile.username,
        'message', 'Tweet pinned to home timeline successfully'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create improved unpin_tweet_from_home function
CREATE OR REPLACE FUNCTION unpin_tweet_from_home(tweet_id UUID)
RETURNS JSON AS $$
DECLARE
    user_profile RECORD;
    result JSON;
BEGIN
    -- Get current user profile
    SELECT id, username, verified, role INTO user_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Check if user is verified admin
    IF user_profile.verified != TRUE OR (user_profile.role != 'admin' AND user_profile.username != 'admin') THEN
        RAISE EXCEPTION 'Only verified admins can unpin tweets from home timeline';
    END IF;
    
    -- Verify tweet exists
    IF NOT EXISTS (SELECT 1 FROM tweets WHERE id = tweet_id) THEN
        RAISE EXCEPTION 'Tweet not found with id: %', tweet_id;
    END IF;
    
    UPDATE tweets 
    SET pinned_to_home = FALSE, pinned_at = NULL
    WHERE id = tweet_id;
    
    -- Return success with details
    SELECT json_build_object(
        'success', true,
        'tweet_id', tweet_id,
        'message', 'Tweet unpinned from home timeline successfully'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION pin_tweet_to_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unpin_tweet_from_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pin_tweet_to_home(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unpin_tweet_from_home(UUID) TO authenticated;

-- 9. Create a helper function to check admin status easily
CREATE OR REPLACE FUNCTION check_admin_status()
RETURNS JSON AS $$
DECLARE
    user_profile RECORD;
    result JSON;
BEGIN
    SELECT id, username, verified, role INTO user_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    SELECT json_build_object(
        'user_id', user_profile.id,
        'username', user_profile.username,
        'verified', user_profile.verified,
        'role', user_profile.role,
        'can_pin_to_home', (user_profile.verified = TRUE AND (user_profile.role = 'admin' OR user_profile.username = 'admin')),
        'can_pin_to_profile', true
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_admin_status() TO authenticated;

-- 10. Test your admin status
SELECT check_admin_status();

-- 11. Show all currently pinned tweets
SELECT 
    t.id,
    SUBSTRING(t.content, 1, 100) as content_preview,
    p.username as author,
    t.pinned_to_profile,
    t.pinned_to_home,
    t.pinned_at
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE t.pinned_to_profile = TRUE OR t.pinned_to_home = TRUE
ORDER BY t.pinned_at DESC; 