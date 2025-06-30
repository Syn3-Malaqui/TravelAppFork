-- Fix pinned tweet functionality - Safe migration
-- This migration safely adds pinned tweet functionality without conflicts

-- Only add columns if they don't exist
DO $$ 
BEGIN
    -- Check and add pinned_to_profile column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tweets' AND column_name = 'pinned_to_profile') THEN
        ALTER TABLE tweets ADD COLUMN pinned_to_profile BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check and add pinned_to_home column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tweets' AND column_name = 'pinned_to_home') THEN
        ALTER TABLE tweets ADD COLUMN pinned_to_home BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check and add pinned_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tweets' AND column_name = 'pinned_at') THEN
        ALTER TABLE tweets ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_tweets_pinned_profile ON tweets(author_id, pinned_to_profile) WHERE pinned_to_profile = TRUE;
CREATE INDEX IF NOT EXISTS idx_tweets_pinned_home ON tweets(pinned_to_home, pinned_at) WHERE pinned_to_home = TRUE;

-- Drop existing functions if they exist to recreate them
DROP FUNCTION IF EXISTS pin_tweet_to_profile(UUID);
DROP FUNCTION IF EXISTS unpin_tweet_from_profile(UUID);
DROP FUNCTION IF EXISTS pin_tweet_to_home(UUID);
DROP FUNCTION IF EXISTS unpin_tweet_from_home(UUID);

-- Create function to pin tweet to profile
CREATE OR REPLACE FUNCTION pin_tweet_to_profile(tweet_id UUID)
RETURNS VOID AS $$
DECLARE
    tweet_author_id UUID;
BEGIN
    -- Get the tweet's author and verify ownership
    SELECT author_id INTO tweet_author_id FROM tweets WHERE id = tweet_id;
    
    IF tweet_author_id IS NULL THEN
        RAISE EXCEPTION 'Tweet not found';
    END IF;
    
    IF tweet_author_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only pin your own tweets';
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unpin tweet from profile
CREATE OR REPLACE FUNCTION unpin_tweet_from_profile(tweet_id UUID)
RETURNS VOID AS $$
DECLARE
    tweet_author_id UUID;
BEGIN
    -- Get the tweet's author and verify ownership
    SELECT author_id INTO tweet_author_id FROM tweets WHERE id = tweet_id;
    
    IF tweet_author_id IS NULL THEN
        RAISE EXCEPTION 'Tweet not found';
    END IF;
    
    IF tweet_author_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only unpin your own tweets';
    END IF;
    
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
    
    -- Verify tweet exists
    IF NOT EXISTS (SELECT 1 FROM tweets WHERE id = tweet_id) THEN
        RAISE EXCEPTION 'Tweet not found';
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
    
    -- Verify tweet exists
    IF NOT EXISTS (SELECT 1 FROM tweets WHERE id = tweet_id) THEN
        RAISE EXCEPTION 'Tweet not found';
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

-- Update RLS policies for pinned tweets (if needed)
-- Allow users to read pinned status
-- Allow users to update their own tweets' pinned status
-- Allow admins to update home pinned status

-- Enable RLS if not already enabled
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;

-- Create or replace policies for pinned tweets
DROP POLICY IF EXISTS "Users can read all tweets including pinned status" ON tweets;
CREATE POLICY "Users can read all tweets including pinned status" ON tweets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own tweets pinned status" ON tweets;
CREATE POLICY "Users can update their own tweets pinned status" ON tweets
    FOR UPDATE USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- Policy for admins to update home pinned status
DROP POLICY IF EXISTS "Admins can update home pinned status" ON tweets;
CREATE POLICY "Admins can update home pinned status" ON tweets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND verified = TRUE 
            AND (username = 'admin' OR role = 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND verified = TRUE 
            AND (username = 'admin' OR role = 'admin')
        )
    ); 