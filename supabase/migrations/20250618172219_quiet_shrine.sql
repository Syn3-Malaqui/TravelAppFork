/*
  # Add Tweet Views System

  1. New Tables
    - `tweet_views`
      - `id` (uuid, primary key)
      - `tweet_id` (uuid, foreign key to tweets)
      - `user_id` (uuid, foreign key to profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `tweet_views` table
    - Add policy for users to create their own views
    - Add policy for users to view all tweet views (for counting)

  3. Functions
    - Create function to increment view count
    - Create trigger to update tweet views_count
*/

-- Create tweet_views table
CREATE TABLE IF NOT EXISTS tweet_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id uuid NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tweet_id, user_id)
);

-- Enable RLS
ALTER TABLE tweet_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own views"
  ON tweet_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all tweet views"
  ON tweet_views
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS tweet_views_tweet_id_idx ON tweet_views(tweet_id);
CREATE INDEX IF NOT EXISTS tweet_views_user_id_idx ON tweet_views(user_id);
CREATE INDEX IF NOT EXISTS tweet_views_created_at_idx ON tweet_views(created_at DESC);

-- Function to update tweet views count
CREATE OR REPLACE FUNCTION update_tweet_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tweets 
    SET views_count = views_count + 1
    WHERE id = NEW.tweet_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tweets 
    SET views_count = GREATEST(0, views_count - 1)
    WHERE id = OLD.tweet_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tweet_views_count_trigger ON tweet_views;
CREATE TRIGGER tweet_views_count_trigger
  AFTER INSERT OR DELETE ON tweet_views
  FOR EACH ROW
  EXECUTE FUNCTION update_tweet_views_count();