-- Add pinned tweet functionality
-- Users can pin tweets to their profile
-- Verified admins can pin tweets to home timeline

-- Add pinned columns to tweets table
ALTER TABLE tweets 
ADD COLUMN pinned_to_profile BOOLEAN DEFAULT FALSE,
ADD COLUMN pinned_to_home BOOLEAN DEFAULT FALSE,
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on pinned queries
CREATE INDEX idx_tweets_pinned_profile ON tweets(author_id, pinned_to_profile) WHERE pinned_to_profile = TRUE;
CREATE INDEX idx_tweets_pinned_home ON tweets(pinned_to_home, pinned_at) WHERE pinned_to_home = TRUE;

-- Create function to pin tweet to profile
CREATE OR REPLACE FUNCTION pin_tweet_to_profile(tweet_id UUID)
RETURNS VOID AS $$
BEGIN
    -- First unpin any existing pinned tweet for this user
    UPDATE tweets 
    SET pinned_to_profile = FALSE, pinned_at = NULL
    WHERE author_id = (SELECT author_id FROM tweets WHERE id = tweet_id)
    AND pinned_to_profile = TRUE;
    
    -- Pin the specified tweet
    UPDATE tweets 
    SET pinned_to_profile = TRUE, pinned_at = NOW()
    WHERE id = tweet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unpin tweet from profile
CREATE OR REPLACE FUNCTION unpin_tweet_from_profile(tweet_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE tweets 
    SET pinned_to_profile = FALSE, pinned_at = NULL
    WHERE id = tweet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to pin tweet to home (admin only)
CREATE OR REPLACE FUNCTION pin_tweet_to_home(tweet_id UUID)
RETURNS VOID AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Check if user is verified admin
    SELECT * INTO user_profile 
    FROM profiles 
    WHERE id = auth.uid() 
    AND verified = TRUE 
    AND (username = 'admin' OR role = 'admin');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only verified admins can pin tweets to home timeline';
    END IF;
    
    -- Unpin any existing home-pinned tweets (only one at a time)
    UPDATE tweets 
    SET pinned_to_home = FALSE, pinned_at = NULL
    WHERE pinned_to_home = TRUE;
    
    -- Pin the specified tweet
    UPDATE tweets 
    SET pinned_to_home = TRUE, pinned_at = NOW()
    WHERE id = tweet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unpin tweet from home (admin only)
CREATE OR REPLACE FUNCTION unpin_tweet_from_home(tweet_id UUID)
RETURNS VOID AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Check if user is verified admin
    SELECT * INTO user_profile 
    FROM profiles 
    WHERE id = auth.uid() 
    AND verified = TRUE 
    AND (username = 'admin' OR role = 'admin');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only verified admins can unpin tweets from home timeline';
    END IF;
    
    UPDATE tweets 
    SET pinned_to_home = FALSE, pinned_at = NULL
    WHERE id = tweet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION pin_tweet_to_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unpin_tweet_from_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pin_tweet_to_home(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unpin_tweet_from_home(UUID) TO authenticated; 