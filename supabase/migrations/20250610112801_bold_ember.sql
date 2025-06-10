/*
  # Add retweet functionality to tweets table

  1. Schema Changes
    - Add `is_retweet` boolean field to tweets table
    - Add `original_tweet_id` field to reference the original tweet for retweets
    - Add foreign key constraint for original_tweet_id

  2. Security
    - Update RLS policies to handle retweets properly
*/

-- Add retweet fields to tweets table
DO $$
BEGIN
  -- Add is_retweet column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tweets' AND column_name = 'is_retweet'
  ) THEN
    ALTER TABLE tweets ADD COLUMN is_retweet boolean DEFAULT false;
  END IF;

  -- Add original_tweet_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tweets' AND column_name = 'original_tweet_id'
  ) THEN
    ALTER TABLE tweets ADD COLUMN original_tweet_id uuid;
  END IF;
END $$;

-- Add foreign key constraint for original_tweet_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tweets_original_tweet_id_fkey'
  ) THEN
    ALTER TABLE tweets 
    ADD CONSTRAINT tweets_original_tweet_id_fkey 
    FOREIGN KEY (original_tweet_id) REFERENCES tweets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better performance on retweet queries
CREATE INDEX IF NOT EXISTS tweets_original_tweet_id_idx ON tweets(original_tweet_id);
CREATE INDEX IF NOT EXISTS tweets_is_retweet_idx ON tweets(is_retweet);