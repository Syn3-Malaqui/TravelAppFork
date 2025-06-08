/*
  # Create tweets table

  1. New Tables
    - `tweets`
      - `id` (uuid, primary key)
      - `content` (text, not null)
      - `author_id` (uuid, references profiles.id)
      - `reply_to` (uuid, references tweets.id, nullable)
      - `image_urls` (text array)
      - `hashtags` (text array)
      - `mentions` (text array)
      - `likes_count` (integer, default 0)
      - `retweets_count` (integer, default 0)
      - `replies_count` (integer, default 0)
      - `views_count` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `tweets` table
    - Add policies for authenticated users to read all tweets
    - Add policies for users to create tweets
    - Add policies for users to update/delete their own tweets
*/

CREATE TABLE IF NOT EXISTS tweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reply_to uuid REFERENCES tweets(id) ON DELETE CASCADE,
  image_urls text[] DEFAULT '{}',
  hashtags text[] DEFAULT '{}',
  mentions text[] DEFAULT '{}',
  likes_count integer DEFAULT 0,
  retweets_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all tweets
CREATE POLICY "Tweets are viewable by everyone"
  ON tweets
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create tweets
CREATE POLICY "Users can create tweets"
  ON tweets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Allow users to update their own tweets
CREATE POLICY "Users can update own tweets"
  ON tweets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Allow users to delete their own tweets
CREATE POLICY "Users can delete own tweets"
  ON tweets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS tweets_author_id_idx ON tweets(author_id);
CREATE INDEX IF NOT EXISTS tweets_created_at_idx ON tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS tweets_reply_to_idx ON tweets(reply_to);