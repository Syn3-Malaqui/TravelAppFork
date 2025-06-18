/*
  # Update trending hashtags function for 48-hour window

  1. Function Updates
    - Modify get_trending_hashtags to focus on past 48 hours
    - Improve trending algorithm with better scoring
    - Add better performance optimizations

  2. New Functions
    - Add function for keyword search in tweets
    - Add function for hashtag search with keyword filtering
*/

-- Update the trending hashtags function to focus on 48 hours
CREATE OR REPLACE FUNCTION public.get_trending_hashtags(limit_count integer DEFAULT 20)
RETURNS TABLE(hashtag text, count bigint, recent_tweets bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH hashtag_stats AS (
    SELECT
      '#' || LOWER(UNNEST(t.hashtags)) AS tag,
      COUNT(*) AS total_count,
      COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS recent_count,
      COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '48 hours' THEN 1 END) AS past_48h_count,
      SUM(t.likes_count + t.retweets_count * 2 + t.replies_count) AS engagement_score
    FROM tweets t
    WHERE 
      t.hashtags IS NOT NULL 
      AND ARRAY_LENGTH(t.hashtags, 1) > 0
      AND t.created_at >= NOW() - INTERVAL '48 hours'  -- Focus on past 48 hours
      AND t.reply_to IS NULL  -- Only count original tweets, not replies
    GROUP BY LOWER(UNNEST(t.hashtags))
    HAVING COUNT(*) >= 1  -- Include all hashtags used at least once
  )
  SELECT
    hs.tag::text AS hashtag,
    hs.past_48h_count AS count,
    hs.recent_count AS recent_tweets
  FROM hashtag_stats hs
  ORDER BY 
    -- Trending score: prioritize recent activity and engagement
    (hs.recent_count * 5 + hs.past_48h_count * 2 + hs.engagement_score * 0.1) DESC,
    hs.past_48h_count DESC,
    hs.recent_count DESC
  LIMIT limit_count;
END;
$function$;

-- Create function for keyword search in tweets
CREATE OR REPLACE FUNCTION public.search_tweets_by_keyword(
  search_keyword text,
  limit_count integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  content text,
  author_id uuid,
  image_urls text[],
  hashtags text[],
  mentions text[],
  tags text[],
  likes_count integer,
  retweets_count integer,
  replies_count integer,
  views_count integer,
  created_at timestamptz,
  is_retweet boolean,
  original_tweet_id uuid,
  relevance_score numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.content,
    t.author_id,
    t.image_urls,
    t.hashtags,
    t.mentions,
    t.tags,
    t.likes_count,
    t.retweets_count,
    t.replies_count,
    t.views_count,
    t.created_at,
    t.is_retweet,
    t.original_tweet_id,
    -- Calculate relevance score based on keyword matches and engagement
    (
      -- Content match score (higher for exact matches)
      CASE 
        WHEN LOWER(t.content) LIKE '%' || LOWER(search_keyword) || '%' THEN 10
        ELSE 0
      END +
      -- Hashtag match score
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM UNNEST(t.hashtags) AS hashtag 
          WHERE LOWER(hashtag) LIKE '%' || LOWER(search_keyword) || '%'
        ) THEN 5
        ELSE 0
      END +
      -- Tag match score
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM UNNEST(t.tags) AS tag 
          WHERE LOWER(tag) LIKE '%' || LOWER(search_keyword) || '%'
        ) THEN 3
        ELSE 0
      END +
      -- Engagement score (normalized)
      (t.likes_count + t.retweets_count * 2 + t.replies_count) * 0.01
    )::numeric AS relevance_score
  FROM tweets t
  WHERE 
    t.reply_to IS NULL  -- Only top-level tweets
    AND (
      -- Search in content
      LOWER(t.content) LIKE '%' || LOWER(search_keyword) || '%'
      OR
      -- Search in hashtags
      EXISTS (
        SELECT 1 FROM UNNEST(t.hashtags) AS hashtag 
        WHERE LOWER(hashtag) LIKE '%' || LOWER(search_keyword) || '%'
      )
      OR
      -- Search in tags
      EXISTS (
        SELECT 1 FROM UNNEST(t.tags) AS tag 
        WHERE LOWER(tag) LIKE '%' || LOWER(search_keyword) || '%'
      )
    )
  ORDER BY 
    relevance_score DESC,
    t.created_at DESC
  LIMIT limit_count;
END;
$function$;

-- Create indexes to improve search performance
CREATE INDEX IF NOT EXISTS tweets_content_search_idx ON tweets USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS tweets_hashtags_search_idx ON tweets USING gin(hashtags);
CREATE INDEX IF NOT EXISTS tweets_tags_search_idx ON tweets USING gin(tags);