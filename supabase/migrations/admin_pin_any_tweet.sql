-- Enhanced admin pin functionality - allows admins to pin any tweet to home timeline
-- If pinning a retweet, it will automatically pin the original tweet instead

-- Drop existing functions first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS pin_tweet_to_home(UUID);
DROP FUNCTION IF EXISTS unpin_tweet_from_home(UUID);

-- Create improved pin_tweet_to_home function that handles retweets
CREATE OR REPLACE FUNCTION pin_tweet_to_home(input_tweet_id UUID)
RETURNS JSON AS $$
DECLARE
    user_profile RECORD;
    tweet_record RECORD;
    target_tweet_id UUID;
    result JSON;
BEGIN
    -- Get current user profile with detailed info
    SELECT id, username, verified, role INTO user_profile
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Check if user is verified admin (must be BOTH verified AND admin)
    IF user_profile.verified != TRUE THEN
        RAISE EXCEPTION 'User is not verified. Current status: verified=%, role=%', user_profile.verified, user_profile.role;
    END IF;
    
    IF user_profile.role != 'admin' AND user_profile.username != 'admin' THEN
        RAISE EXCEPTION 'User is not admin. Current status: verified=%, role=%, username=%', 
            user_profile.verified, user_profile.role, user_profile.username;
    END IF;
    
    -- Get the tweet details and check if it's a retweet
    SELECT id, is_retweet, original_tweet_id INTO tweet_record
    FROM tweets 
    WHERE id = input_tweet_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tweet not found with id: %', input_tweet_id;
    END IF;
    
    -- If this is a retweet, pin the original tweet instead
    IF tweet_record.is_retweet = TRUE AND tweet_record.original_tweet_id IS NOT NULL THEN
        target_tweet_id := tweet_record.original_tweet_id;
        RAISE NOTICE 'Input tweet % is a retweet, pinning original tweet % instead', input_tweet_id, target_tweet_id;
        
        -- Verify the original tweet exists
        IF NOT EXISTS (SELECT 1 FROM tweets WHERE id = target_tweet_id) THEN
            RAISE EXCEPTION 'Original tweet not found with id: %', target_tweet_id;
        END IF;
    ELSE
        target_tweet_id := input_tweet_id;
        RAISE NOTICE 'Pinning regular tweet: %', target_tweet_id;
    END IF;
    
    -- Unpin any existing home-pinned tweets (only one at a time)
    UPDATE tweets 
    SET pinned_to_home = FALSE, pinned_at = NULL
    WHERE pinned_to_home = TRUE;
    
    -- Pin the target tweet (either original or the tweet itself)
    UPDATE tweets 
    SET pinned_to_home = TRUE, pinned_at = NOW()
    WHERE id = target_tweet_id;
    
    -- Return success with details
    SELECT json_build_object(
        'success', true,
        'input_tweet_id', input_tweet_id,
        'pinned_tweet_id', target_tweet_id,
        'was_retweet', tweet_record.is_retweet,
        'pinned_at', NOW(),
        'admin_user', user_profile.username,
        'message', CASE 
            WHEN tweet_record.is_retweet THEN 'Retweet detected - pinned original tweet to home timeline successfully'
            ELSE 'Tweet pinned to home timeline successfully'
        END
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved unpin_tweet_from_home function that handles retweets
CREATE OR REPLACE FUNCTION unpin_tweet_from_home(input_tweet_id UUID)
RETURNS JSON AS $$
DECLARE
    user_profile RECORD;
    tweet_record RECORD;
    target_tweet_id UUID;
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
    
    -- Get the tweet details and check if it's a retweet
    SELECT id, is_retweet, original_tweet_id INTO tweet_record
    FROM tweets 
    WHERE id = input_tweet_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tweet not found with id: %', input_tweet_id;
    END IF;
    
    -- If this is a retweet, unpin the original tweet instead
    IF tweet_record.is_retweet = TRUE AND tweet_record.original_tweet_id IS NOT NULL THEN
        target_tweet_id := tweet_record.original_tweet_id;
        RAISE NOTICE 'Input tweet % is a retweet, unpinning original tweet % instead', input_tweet_id, target_tweet_id;
    ELSE
        target_tweet_id := input_tweet_id;
        RAISE NOTICE 'Unpinning regular tweet: %', target_tweet_id;
    END IF;
    
    -- Verify the target tweet exists
    IF NOT EXISTS (SELECT 1 FROM tweets WHERE id = target_tweet_id) THEN
        RAISE EXCEPTION 'Target tweet not found with id: %', target_tweet_id;
    END IF;
    
    UPDATE tweets 
    SET pinned_to_home = FALSE, pinned_at = NULL
    WHERE id = target_tweet_id;
    
    -- Return success with details
    SELECT json_build_object(
        'success', true,
        'input_tweet_id', input_tweet_id,
        'unpinned_tweet_id', target_tweet_id,
        'was_retweet', tweet_record.is_retweet,
        'message', CASE 
            WHEN tweet_record.is_retweet THEN 'Retweet detected - unpinned original tweet from home timeline successfully'
            ELSE 'Tweet unpinned from home timeline successfully'
        END
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION pin_tweet_to_home(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unpin_tweet_from_home(UUID) TO authenticated;

-- Create a helper function to get the effective tweet ID (original if retweet)
CREATE OR REPLACE FUNCTION get_effective_tweet_id(input_tweet_id UUID)
RETURNS UUID AS $$
DECLARE
    tweet_record RECORD;
BEGIN
    SELECT id, is_retweet, original_tweet_id INTO tweet_record
    FROM tweets 
    WHERE id = input_tweet_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tweet not found with id: %', input_tweet_id;
    END IF;
    
    -- If this is a retweet, return the original tweet ID
    IF tweet_record.is_retweet = TRUE AND tweet_record.original_tweet_id IS NOT NULL THEN
        RETURN tweet_record.original_tweet_id;
    ELSE
        RETURN input_tweet_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_effective_tweet_id(UUID) TO authenticated; 