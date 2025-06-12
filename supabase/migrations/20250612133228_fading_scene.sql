/*
  # Add notifications system

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `recipient_id` (uuid, references profiles.id) - who receives the notification
      - `actor_id` (uuid, references profiles.id) - who performed the action
      - `type` (text) - 'like', 'retweet', 'reply', 'follow'
      - `tweet_id` (uuid, references tweets.id, nullable) - related tweet if applicable
      - `read` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on notifications table
    - Users can only see their own notifications
    - Users can mark their own notifications as read

  3. Triggers
    - Auto-create notifications when users like, retweet, or reply to tweets
    - Auto-create notifications when users follow others
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'retweet', 'reply', 'follow')),
  tweet_id uuid REFERENCES tweets(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  -- Prevent duplicate notifications for the same action
  UNIQUE(recipient_id, actor_id, type, tweet_id)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT TO authenticated 
  USING (auth.uid() = recipient_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE TO authenticated 
  USING (auth.uid() = recipient_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_tweet_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Don't create notification if user is acting on their own content
  IF p_recipient_id = p_actor_id THEN
    RETURN;
  END IF;

  -- Insert notification, ignore if duplicate
  INSERT INTO notifications (recipient_id, actor_id, type, tweet_id)
  VALUES (p_recipient_id, p_actor_id, p_type, p_tweet_id)
  ON CONFLICT (recipient_id, actor_id, type, tweet_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle like notifications
CREATE OR REPLACE FUNCTION handle_like_notification()
RETURNS trigger AS $$
DECLARE
  tweet_author_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the tweet author
    SELECT author_id INTO tweet_author_id
    FROM tweets
    WHERE id = NEW.tweet_id;

    -- Create notification
    PERFORM create_notification(
      tweet_author_id,
      NEW.user_id,
      'like',
      NEW.tweet_id
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove notification when like is removed
    DELETE FROM notifications
    WHERE recipient_id = (SELECT author_id FROM tweets WHERE id = OLD.tweet_id)
      AND actor_id = OLD.user_id
      AND type = 'like'
      AND tweet_id = OLD.tweet_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle retweet notifications
CREATE OR REPLACE FUNCTION handle_retweet_notification()
RETURNS trigger AS $$
DECLARE
  tweet_author_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the tweet author
    SELECT author_id INTO tweet_author_id
    FROM tweets
    WHERE id = NEW.tweet_id;

    -- Create notification
    PERFORM create_notification(
      tweet_author_id,
      NEW.user_id,
      'retweet',
      NEW.tweet_id
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove notification when retweet is removed
    DELETE FROM notifications
    WHERE recipient_id = (SELECT author_id FROM tweets WHERE id = OLD.tweet_id)
      AND actor_id = OLD.user_id
      AND type = 'retweet'
      AND tweet_id = OLD.tweet_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle reply notifications
CREATE OR REPLACE FUNCTION handle_reply_notification()
RETURNS trigger AS $$
DECLARE
  original_tweet_author_id uuid;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to IS NOT NULL THEN
    -- Get the original tweet author
    SELECT author_id INTO original_tweet_author_id
    FROM tweets
    WHERE id = NEW.reply_to;

    -- Create notification
    PERFORM create_notification(
      original_tweet_author_id,
      NEW.author_id,
      'reply',
      NEW.reply_to
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.reply_to IS NOT NULL THEN
    -- Remove notification when reply is deleted
    DELETE FROM notifications
    WHERE recipient_id = (SELECT author_id FROM tweets WHERE id = OLD.reply_to)
      AND actor_id = OLD.author_id
      AND type = 'reply'
      AND tweet_id = OLD.reply_to;
    
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle follow notifications
CREATE OR REPLACE FUNCTION handle_follow_notification()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Create notification
    PERFORM create_notification(
      NEW.following_id,
      NEW.follower_id,
      'follow',
      NULL
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove notification when unfollow
    DELETE FROM notifications
    WHERE recipient_id = OLD.following_id
      AND actor_id = OLD.follower_id
      AND type = 'follow'
      AND tweet_id IS NULL;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for notifications
DROP TRIGGER IF EXISTS like_notification_trigger ON likes;
CREATE TRIGGER like_notification_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION handle_like_notification();

DROP TRIGGER IF EXISTS retweet_notification_trigger ON retweets;
CREATE TRIGGER retweet_notification_trigger
  AFTER INSERT OR DELETE ON retweets
  FOR EACH ROW EXECUTE FUNCTION handle_retweet_notification();

DROP TRIGGER IF EXISTS reply_notification_trigger ON tweets;
CREATE TRIGGER reply_notification_trigger
  AFTER INSERT OR DELETE ON tweets
  FOR EACH ROW EXECUTE FUNCTION handle_reply_notification();

DROP TRIGGER IF EXISTS follow_notification_trigger ON follows;
CREATE TRIGGER follow_notification_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION handle_follow_notification();