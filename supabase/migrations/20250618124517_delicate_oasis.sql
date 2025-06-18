/*
  # Create trending hashtags RPC function

  1. New Functions
    - `get_trending_hashtags(limit_count)` - Returns trending hashtags with statistics
      - `hashtag` (text) - The hashtag without # prefix
      - `count` (bigint) - Total number of tweets with this hashtag
      - `recent_tweets` (bigint) - Number of tweets with this hashtag in last 24 hours

  2. Features
    - Processes hashtags from tweets table
    - Calculates trending score based on recent activity
    - Returns results ordered by trending score (recent tweets weighted higher)
    - Handles case-insensitive hashtag matching
    - Filters out empty hashtag arrays
*/

CREATE OR REPLACE FUNCTION public.get_trending_hashtags(limit_count integer DEFAULT 20)
RETURNS TABLE(hashtag text, count bigint, recent_tweets bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH hashtag_stats AS (
    SELECT
      LOWER(UNNEST(t.hashtags)) AS tag,
      COUNT(*) AS total_count,
      COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS recent_count,
      SUM(t.likes_count + t.retweets_count) AS engagement_score
    FROM tweets t
    WHERE 
      t.hashtags IS NOT NULL 
      AND ARRAY_LENGTH(t.hashtags, 1) > 0
      AND t.created_at >= NOW() - INTERVAL '7 days'  -- Only consider hashtags from last week
    GROUP BY LOWER(UNNEST(t.hashtags))
    HAVING COUNT(*) >= 2  -- Only include hashtags used at least twice
  )
  SELECT
    hs.tag::text AS hashtag,
    hs.total_count AS count,
    hs.recent_count AS recent_tweets
  FROM hashtag_stats hs
  ORDER BY 
    -- Trending score: recent activity weighted more heavily
    (hs.recent_count * 3 + hs.engagement_score * 0.1) DESC,
    hs.total_count DESC
  LIMIT limit_count;
END;
$function$;