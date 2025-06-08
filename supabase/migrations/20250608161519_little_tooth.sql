/*
  # Create user interactions tables

  1. New Tables
    - `likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `tweet_id` (uuid, references tweets.id)
      - `created_at` (timestamp)

    - `retweets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `tweet_id` (uuid, references tweets.id)
      - `created_at` (timestamp)

    - `bookmarks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `tweet_id` (uuid, references tweets.id)
      - `created_at` (timestamp)

    - `follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles.id)
      - `following_id` (uuid, references profiles.id)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all interaction tables
    - Add appropriate policies for each table
*/

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tweet_id uuid NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tweet_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
  ON likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own likes"
  ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Retweets table
CREATE TABLE IF NOT EXISTS retweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tweet_id uuid NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tweet_id)
);

ALTER TABLE retweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all retweets"
  ON retweets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own retweets"
  ON retweets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own retweets"
  ON retweets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tweet_id uuid NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tweet_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own follows"
  ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows"
  ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS likes_tweet_id_idx ON likes(tweet_id);
CREATE INDEX IF NOT EXISTS retweets_user_id_idx ON retweets(user_id);
CREATE INDEX IF NOT EXISTS retweets_tweet_id_idx ON retweets(tweet_id);
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_tweet_id_idx ON bookmarks(tweet_id);
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);