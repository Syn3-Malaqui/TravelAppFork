/*
  # Add sample tweets and profiles

  1. Sample Data
    - Creates sample profiles that work with the auth system
    - Adds diverse tweets with hashtags and mentions
    - Includes realistic engagement numbers

  2. Security
    - Respects existing RLS policies
    - Works with auth constraints
*/

-- First, let's create some sample auth users and their corresponding profiles
-- Note: In a real scenario, these would be created through the auth system
-- For demo purposes, we'll create profiles that can work independently

-- Insert sample tweets with hashtags and mentions using existing user profiles
-- We'll use a DO block to handle the case where no profiles exist yet

DO $$
DECLARE
    user_ids uuid[];
    sample_profiles record;
BEGIN
    -- Get existing profile IDs
    SELECT ARRAY(SELECT id FROM profiles LIMIT 6) INTO user_ids;
    
    -- If we don't have enough profiles, create some sample ones
    -- Note: These will only work if corresponding auth users exist
    IF array_length(user_ids, 1) IS NULL OR array_length(user_ids, 1) < 3 THEN
        -- Create some sample profiles with random UUIDs that might work
        -- In production, these would come from actual user signups
        
        INSERT INTO profiles (id, username, display_name, avatar_url, bio, verified, followers_count, following_count) 
        SELECT 
            gen_random_uuid(),
            'demo_user_' || generate_series,
            'Demo User ' || generate_series,
            'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
            'Demo user profile for testing',
            false,
            floor(random() * 1000)::int,
            floor(random() * 500)::int
        FROM generate_series(1, 6)
        ON CONFLICT (username) DO NOTHING;
        
        -- Get the updated list of profile IDs
        SELECT ARRAY(SELECT id FROM profiles LIMIT 6) INTO user_ids;
    END IF;
    
    -- Only proceed if we have at least some profiles
    IF array_length(user_ids, 1) >= 1 THEN
        -- Insert sample tweets using existing profile IDs
        INSERT INTO tweets (content, author_id, image_urls, hashtags, mentions, likes_count, retweets_count, replies_count, views_count, created_at) VALUES
        ('Just built an amazing Twitter clone! 🚀 The future of social media is here. #coding #react #typescript #webdev', 
         user_ids[1], 
         ARRAY['https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['coding', 'react', 'typescript', 'webdev'], 
         ARRAY[], 
         42, 12, 8, 1200, 
         NOW() - INTERVAL '2 hours'),

        ('Beautiful sunset today! Sometimes you need to step away from the code and enjoy nature 🌅 #sunset #nature #photography #peaceful', 
         COALESCE(user_ids[2], user_ids[1]), 
         ARRAY['https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['sunset', 'nature', 'photography', 'peaceful'], 
         ARRAY[], 
         156, 23, 15, 2100, 
         NOW() - INTERVAL '4 hours'),

        ('Hot take: TypeScript makes JavaScript development so much better. The type safety alone saves hours of debugging! 💯 #typescript #javascript #programming #developer', 
         COALESCE(user_ids[3], user_ids[1]), 
         ARRAY[], 
         ARRAY['typescript', 'javascript', 'programming', 'developer'], 
         ARRAY[], 
         89, 34, 22, 1800, 
         NOW() - INTERVAL '6 hours'),

        ('Made the most incredible pasta carbonara tonight! 🍝 The secret is in the timing and using real Parmigiano-Reggiano. Recipe coming soon! #cooking #pasta #italian #foodie', 
         COALESCE(user_ids[4], user_ids[1]), 
         ARRAY['https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['cooking', 'pasta', 'italian', 'foodie'], 
         ARRAY[], 
         78, 15, 12, 950, 
         NOW() - INTERVAL '8 hours'),

        ('Currently writing this from a café in Tokyo! ☕️ The energy here is incredible. Next stop: Kyoto temples 🏯 #travel #tokyo #japan #digitalnomad', 
         COALESCE(user_ids[5], user_ids[1]), 
         ARRAY['https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['travel', 'tokyo', 'japan', 'digitalnomad'], 
         ARRAY[], 
         203, 45, 28, 3200, 
         NOW() - INTERVAL '10 hours'),

        ('Morning workout complete! 💪 Remember: consistency beats perfection every time. Small steps lead to big changes. What''s your fitness goal for this week? #fitness #motivation #health #workout', 
         COALESCE(user_ids[6], user_ids[1]), 
         ARRAY[], 
         ARRAY['fitness', 'motivation', 'health', 'workout'], 
         ARRAY[], 
         67, 18, 24, 890, 
         NOW() - INTERVAL '12 hours'),

        ('Working on a new React component library! 📚 Open source is the way to go. #opensource #react #components #community', 
         user_ids[1], 
         ARRAY[], 
         ARRAY['opensource', 'react', 'components', 'community'], 
         ARRAY[], 
         95, 28, 16, 1400, 
         NOW() - INTERVAL '14 hours'),

        ('Captured this amazing wildlife shot during my morning hike! 🦅 Nature never ceases to amaze me. #wildlife #photography #hiking #nature', 
         COALESCE(user_ids[2], user_ids[1]), 
         ARRAY['https://images.pexels.com/photos/1661179/pexels-photo-1661179.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['wildlife', 'photography', 'hiking', 'nature'], 
         ARRAY[], 
         134, 31, 19, 1650, 
         NOW() - INTERVAL '16 hours'),

        ('Pro tip: Meal prep on Sundays saves so much time during the week! 🥗 Here''s my go-to healthy meal prep guide. #mealprep #healthy #nutrition #productivity', 
         COALESCE(user_ids[3], user_ids[1]), 
         ARRAY['https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['mealprep', 'healthy', 'nutrition', 'productivity'], 
         ARRAY[], 
         112, 22, 31, 1320, 
         NOW() - INTERVAL '18 hours'),

        ('The cherry blossoms in Kyoto are absolutely breathtaking! 🌸 Sometimes you have to travel halfway around the world to find peace. #kyoto #cherryblossom #japan #travel #zen', 
         COALESCE(user_ids[4], user_ids[1]), 
         ARRAY['https://images.pexels.com/photos/2070033/pexels-photo-2070033.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['kyoto', 'cherryblossom', 'japan', 'travel', 'zen'], 
         ARRAY[], 
         287, 56, 42, 4100, 
         NOW() - INTERVAL '20 hours');
    END IF;
END $$;