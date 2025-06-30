-- Test script for admin pin functionality
-- This script tests that admins can pin any tweet to home timeline
-- and that retweets automatically pin the original tweet instead

-- Check admin status first
SELECT 'Checking admin status...' as test_step;
SELECT check_admin_status();

-- Check if there are any retweets in the system
SELECT 'Checking for retweets in the system...' as test_step;
SELECT 
    t.id as retweet_id,
    t.original_tweet_id,
    SUBSTRING(original.content, 1, 50) || '...' as original_content,
    p.username as retweeter
FROM tweets t
JOIN tweets original ON t.original_tweet_id = original.id
JOIN profiles p ON t.author_id = p.id
WHERE t.is_retweet = TRUE
LIMIT 5;

-- Check regular tweets
SELECT 'Checking for regular tweets...' as test_step;
SELECT 
    t.id,
    SUBSTRING(t.content, 1, 50) || '...' as content,
    p.username as author,
    t.pinned_to_home
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE t.is_retweet = FALSE
LIMIT 5;

-- Test the get_effective_tweet_id function
SELECT 'Testing get_effective_tweet_id function...' as test_step;

-- First, get a retweet ID if available
WITH retweet_sample AS (
    SELECT id as retweet_id, original_tweet_id
    FROM tweets 
    WHERE is_retweet = TRUE 
    LIMIT 1
)
SELECT 
    retweet_id,
    original_tweet_id,
    get_effective_tweet_id(retweet_id) as effective_id,
    CASE 
        WHEN get_effective_tweet_id(retweet_id) = original_tweet_id 
        THEN '✅ Correctly returns original tweet ID'
        ELSE '❌ Error: Should return original tweet ID'
    END as test_result
FROM retweet_sample;

-- Test with regular tweet
WITH regular_tweet_sample AS (
    SELECT id
    FROM tweets 
    WHERE is_retweet = FALSE 
    LIMIT 1
)
SELECT 
    id as tweet_id,
    get_effective_tweet_id(id) as effective_id,
    CASE 
        WHEN get_effective_tweet_id(id) = id 
        THEN '✅ Correctly returns same tweet ID'
        ELSE '❌ Error: Should return same tweet ID'
    END as test_result
FROM regular_tweet_sample;

-- Show current home pinned tweets before test
SELECT 'Current home pinned tweets before test...' as test_step;
SELECT 
    t.id,
    SUBSTRING(t.content, 1, 100) as content,
    p.username as author,
    t.pinned_at
FROM tweets t
JOIN profiles p ON t.author_id = p.id
WHERE t.pinned_to_home = TRUE;

-- Instructions for manual testing:
SELECT 'Manual Testing Instructions:' as instructions;
SELECT '1. Copy a tweet ID from above (either regular or retweet)' as step_1;
SELECT '2. Run: SELECT pin_tweet_to_home(''TWEET_ID_HERE'');' as step_2;
SELECT '3. Check the results and verify correct behavior' as step_3;
SELECT '4. If you pinned a retweet, verify the original tweet got pinned instead' as step_4;
SELECT '5. Run: SELECT unpin_tweet_from_home(''TWEET_ID_HERE''); to clean up' as step_5;

-- Example commands (commented out - replace with actual IDs):
-- SELECT pin_tweet_to_home('REPLACE_WITH_ACTUAL_TWEET_ID');
-- SELECT unpin_tweet_from_home('REPLACE_WITH_ACTUAL_TWEET_ID'); 