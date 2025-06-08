/*
  # Add Sample Tweets with Hashtags

  1. Sample Data
    - Adds diverse sample tweets with hashtags and mentions
    - Only works with existing user profiles (created through auth signup)
    - Includes realistic engagement metrics and timestamps
    - Features various content types: tech, nature, food, travel, fitness

  2. Safety
    - Only inserts tweets if profiles exist
    - Uses existing profile IDs as authors
    - Respects all RLS policies and constraints
    - No attempt to create profiles (requires auth users)
*/

-- Insert sample tweets only if we have existing profiles
-- This ensures we don't violate foreign key constraints

DO $$
DECLARE
    user_ids uuid[];
    user_count integer;
BEGIN
    -- Get existing profile IDs
    SELECT ARRAY(SELECT id FROM profiles ORDER BY created_at LIMIT 10) INTO user_ids;
    user_count := array_length(user_ids, 1);
    
    -- Only proceed if we have at least one existing profile
    IF user_count >= 1 THEN
        -- Insert sample tweets using existing profile IDs
        INSERT INTO tweets (content, author_id, image_urls, hashtags, mentions, likes_count, retweets_count, replies_count, views_count, created_at) VALUES
        ('Just built an amazing Twitter clone! 🚀 The future of social media is here. Thanks for all the inspiration! #coding #react #typescript #webdev #programming', 
         user_ids[1], 
         ARRAY['https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['coding', 'react', 'typescript', 'webdev', 'programming'], 
         ARRAY[], 
         42, 12, 8, 1200, 
         NOW() - INTERVAL '2 hours'),

        ('Beautiful sunset today! Sometimes you need to step away from the code and enjoy nature 🌅 Perfect end to a productive day. #sunset #nature #photography #peaceful #mindfulness', 
         user_ids[LEAST(2, user_count)], 
         ARRAY['https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['sunset', 'nature', 'photography', 'peaceful', 'mindfulness'], 
         ARRAY[], 
         156, 23, 15, 2100, 
         NOW() - INTERVAL '4 hours'),

        ('Hot take: TypeScript makes JavaScript development so much better. The type safety alone saves hours of debugging! Who else agrees? 💯 #typescript #javascript #programming #developer #webdev', 
         user_ids[LEAST(3, user_count)], 
         ARRAY[], 
         ARRAY['typescript', 'javascript', 'programming', 'developer', 'webdev'], 
         ARRAY[], 
         89, 34, 22, 1800, 
         NOW() - INTERVAL '6 hours'),

        ('Made the most incredible pasta carbonara tonight! 🍝 The secret is in the timing and using real Parmigiano-Reggiano. Recipe coming soon! #cooking #pasta #italian #foodie #homecooking', 
         user_ids[LEAST(4, user_count)], 
         ARRAY['https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['cooking', 'pasta', 'italian', 'foodie', 'homecooking'], 
         ARRAY[], 
         78, 15, 12, 950, 
         NOW() - INTERVAL '8 hours'),

        ('Currently writing this from a café in Tokyo! ☕️ The energy here is incredible. Next stop: Kyoto temples 🏯 Living the digital nomad dream! #travel #tokyo #japan #digitalnomad #remote', 
         user_ids[LEAST(5, user_count)], 
         ARRAY['https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['travel', 'tokyo', 'japan', 'digitalnomad', 'remote'], 
         ARRAY[], 
         203, 45, 28, 3200, 
         NOW() - INTERVAL '10 hours'),

        ('Morning workout complete! 💪 Remember: consistency beats perfection every time. Small steps lead to big changes. What''s your fitness goal for this week? #fitness #motivation #health #workout #consistency', 
         user_ids[LEAST(6, user_count)], 
         ARRAY[], 
         ARRAY['fitness', 'motivation', 'health', 'workout', 'consistency'], 
         ARRAY[], 
         67, 18, 24, 890, 
         NOW() - INTERVAL '12 hours'),

        ('Working on a new React component library! 📚 Open source is the way to go. Collaboration makes everything better! #opensource #react #components #community #collaboration', 
         user_ids[1], 
         ARRAY[], 
         ARRAY['opensource', 'react', 'components', 'community', 'collaboration'], 
         ARRAY[], 
         95, 28, 16, 1400, 
         NOW() - INTERVAL '14 hours'),

        ('Captured this amazing wildlife shot during my morning hike! 🦅 Nature never ceases to amaze me. The early bird really does catch the worm! #wildlife #photography #hiking #nature #earlybird', 
         user_ids[LEAST(2, user_count)], 
         ARRAY['https://images.pexels.com/photos/1661179/pexels-photo-1661179.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['wildlife', 'photography', 'hiking', 'nature', 'earlybird'], 
         ARRAY[], 
         134, 31, 19, 1650, 
         NOW() - INTERVAL '16 hours'),

        ('Pro tip: Meal prep on Sundays saves so much time during the week! 🥗 Here''s my go-to healthy meal prep guide. Efficiency is key! #mealprep #healthy #nutrition #productivity #efficiency', 
         user_ids[LEAST(3, user_count)], 
         ARRAY['https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['mealprep', 'healthy', 'nutrition', 'productivity', 'efficiency'], 
         ARRAY[], 
         112, 22, 31, 1320, 
         NOW() - INTERVAL '18 hours'),

        ('The cherry blossoms in Kyoto are absolutely breathtaking! 🌸 Sometimes you have to travel halfway around the world to find peace. #kyoto #cherryblossom #japan #travel #zen #peace', 
         user_ids[LEAST(4, user_count)], 
         ARRAY['https://images.pexels.com/photos/2070033/pexels-photo-2070033.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['kyoto', 'cherryblossom', 'japan', 'travel', 'zen', 'peace'], 
         ARRAY[], 
         287, 56, 42, 4100, 
         NOW() - INTERVAL '20 hours'),

        ('Coffee and code - the perfect combination! ☕️💻 Working on some exciting new features today. The grind never stops! #coffee #coding #developer #grind #features', 
         user_ids[LEAST(5, user_count)], 
         ARRAY['https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['coffee', 'coding', 'developer', 'grind', 'features'], 
         ARRAY[], 
         73, 19, 11, 980, 
         NOW() - INTERVAL '22 hours'),

        ('Just finished reading an amazing book on design patterns! 📖 Knowledge is power, and sharing knowledge is even more powerful. #books #learning #designpatterns #knowledge #sharing', 
         user_ids[LEAST(6, user_count)], 
         ARRAY[], 
         ARRAY['books', 'learning', 'designpatterns', 'knowledge', 'sharing'], 
         ARRAY[], 
         45, 8, 6, 720, 
         NOW() - INTERVAL '1 day'),

        ('Weekend farmers market haul! 🥕🥬 Supporting local farmers and eating fresh is the way to go. Community matters! #farmersmarket #local #fresh #community #sustainable', 
         user_ids[1], 
         ARRAY['https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['farmersmarket', 'local', 'fresh', 'community', 'sustainable'], 
         ARRAY[], 
         92, 14, 18, 1150, 
         NOW() - INTERVAL '1 day 2 hours'),

        ('Late night debugging session! 🐛 Sometimes the best solutions come when everyone else is asleep. The quiet helps me think. #debugging #latenight #coding #solutions #quiet', 
         user_ids[LEAST(2, user_count)], 
         ARRAY[], 
         ARRAY['debugging', 'latenight', 'coding', 'solutions', 'quiet'], 
         ARRAY[], 
         38, 7, 9, 560, 
         NOW() - INTERVAL '1 day 4 hours'),

        ('Mountain biking adventure today! 🚵‍♂️ Nothing beats the rush of conquering a challenging trail. Adventure awaits! #mountainbiking #adventure #trail #rush #outdoors', 
         user_ids[LEAST(3, user_count)], 
         ARRAY['https://images.pexels.com/photos/1571939/pexels-photo-1571939.jpeg?auto=compress&cs=tinysrgb&w=600'], 
         ARRAY['mountainbiking', 'adventure', 'trail', 'rush', 'outdoors'], 
         ARRAY[], 
         126, 25, 14, 1680, 
         NOW() - INTERVAL '1 day 6 hours');

        RAISE NOTICE 'Successfully inserted % sample tweets using % existing profiles', 15, user_count;
    ELSE
        RAISE NOTICE 'No existing profiles found. Please sign up users first to see sample tweets.';
    END IF;
END $$;