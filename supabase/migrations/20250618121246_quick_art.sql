/*
  # Optimize tweet loading performance

  1. Database Optimizations
    - Add composite indexes for better query performance
    - Optimize tweet fetching with selective field loading
    - Add indexes for common query patterns

  2. Performance Improvements
    - Index on (created_at DESC, reply_to) for timeline queries
    - Index on (author_id, created_at DESC) for user tweets
    - Index on (is_retweet, original_tweet_id) for retweet queries
    - Composite index for following feed queries
*/

-- Add composite indexes for better performance
CREATE INDEX IF NOT EXISTS tweets_timeline_idx ON tweets(reply_to, created_at DESC) WHERE reply_to IS NULL;
CREATE INDEX IF NOT EXISTS tweets_user_timeline_idx ON tweets(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tweets_retweet_lookup_idx ON tweets(is_retweet, original_tweet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tweets_reply_lookup_idx ON tweets(reply_to, created_at DESC) WHERE reply_to IS NOT NULL;

-- Add index for following queries
CREATE INDEX IF NOT EXISTS follows_following_timeline_idx ON follows(follower_id, created_at DESC);

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS tweets_non_replies_idx ON tweets(created_at DESC) WHERE reply_to IS NULL;
CREATE INDEX IF NOT EXISTS tweets_retweets_idx ON tweets(created_at DESC) WHERE is_retweet = true;

-- Add index for country-based filtering
CREATE INDEX IF NOT EXISTS profiles_country_created_idx ON profiles(country, created_at DESC);

-- Optimize the profiles table for joins
CREATE INDEX IF NOT EXISTS profiles_id_username_idx ON profiles(id, username, display_name);