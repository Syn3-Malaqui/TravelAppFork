/*
  # Create functions and triggers for maintaining counts

  1. Functions
    - Update tweet counts when likes/retweets change
    - Update user follower/following counts
    - Update reply counts

  2. Triggers
    - Automatically update counts when interactions change
*/

-- Function to update tweet likes count
CREATE OR REPLACE FUNCTION update_tweet_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tweets 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.tweet_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tweets 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.tweet_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update tweet retweets count
CREATE OR REPLACE FUNCTION update_tweet_retweets_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tweets 
    SET retweets_count = retweets_count + 1 
    WHERE id = NEW.tweet_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tweets 
    SET retweets_count = GREATEST(0, retweets_count - 1) 
    WHERE id = OLD.tweet_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user follower counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increase following count for follower
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    -- Increase followers count for followed user
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease following count for follower
    UPDATE profiles 
    SET following_count = GREATEST(0, following_count - 1) 
    WHERE id = OLD.follower_id;
    
    -- Decrease followers count for followed user
    UPDATE profiles 
    SET followers_count = GREATEST(0, followers_count - 1) 
    WHERE id = OLD.following_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update reply counts
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to IS NOT NULL THEN
    UPDATE tweets 
    SET replies_count = replies_count + 1 
    WHERE id = NEW.reply_to;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.reply_to IS NOT NULL THEN
    UPDATE tweets 
    SET replies_count = GREATEST(0, replies_count - 1) 
    WHERE id = OLD.reply_to;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS likes_count_trigger ON likes;
CREATE TRIGGER likes_count_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_tweet_likes_count();

DROP TRIGGER IF EXISTS retweets_count_trigger ON retweets;
CREATE TRIGGER retweets_count_trigger
  AFTER INSERT OR DELETE ON retweets
  FOR EACH ROW EXECUTE FUNCTION update_tweet_retweets_count();

DROP TRIGGER IF EXISTS follow_counts_trigger ON follows;
CREATE TRIGGER follow_counts_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

DROP TRIGGER IF EXISTS reply_count_trigger ON tweets;
CREATE TRIGGER reply_count_trigger
  AFTER INSERT OR DELETE ON tweets
  FOR EACH ROW EXECUTE FUNCTION update_reply_count();