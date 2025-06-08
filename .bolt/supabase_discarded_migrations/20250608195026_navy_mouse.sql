/*
  # Add sample tweets with tags

  1. Sample Data
    - Create sample profiles for tweet authors
    - Add sample tweets with hashtags and mentions
    - Include various types of content (text, images, hashtags)
  
  2. Features
    - Tweets with hashtags like #coding, #travel, #food
    - Different user profiles with verified status
    - Realistic engagement numbers
*/

-- Insert sample profiles
INSERT INTO profiles (id, username, display_name, avatar_url, bio, verified, followers_count, following_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'techdev', 'Tech Developer', 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150', 'Full-stack developer passionate about React and TypeScript', true, 1250, 340),
('550e8400-e29b-41d4-a716-446655440002', 'naturelover', 'Sarah Johnson', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150', 'Photographer and nature enthusiast 📸🌿', false, 890, 234),
('550e8400-e29b-41d4-a716-446655440003', 'jsexpert', 'Alex Chen', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150', 'JavaScript enthusiast, TypeScript advocate', true, 3400, 567),
('550e8400-e29b-41d4-a716-446655440004', 'foodie_mike', 'Mike Rodriguez', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150', 'Food blogger and chef 👨‍🍳 Sharing delicious recipes', false, 2100, 445),
('550e8400-e29b-41d4-a716-446655440005', 'travel_emma', 'Emma Wilson', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150', 'Digital nomad ✈️ Exploring the world one city at a time', true, 5200, 890),
('550e8400-e29b-41d4-a716-446655440006', 'fitness_coach', 'David Kim', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150', 'Personal trainer and fitness enthusiast 💪 Helping you reach your goals', false, 1800, 320)
ON CONFLICT (id) DO NOTHING;

-- Insert sample tweets with hashtags and mentions
INSERT INTO tweets (id, content, author_id, image_urls, hashtags, mentions, likes_count, retweets_count, replies_count, views_count, created_at) VALUES
('tweet-001', 'Just built an amazing Twitter clone! 🚀 The future of social media is here. Thanks to @naturelover for the inspiration! #coding #react #typescript #webdev', '550e8400-e29b-41d4-a716-446655440001', ARRAY['https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=600'], ARRAY['coding', 'react', 'typescript', 'webdev'], ARRAY['naturelover'], 42, 12, 8, 1200, NOW() - INTERVAL '2 hours'),

('tweet-002', 'Beautiful sunset today! Sometimes you need to step away from the code and enjoy nature 🌅 #sunset #nature #photography #peaceful', '550e8400-e29b-41d4-a716-446655440002', ARRAY['https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=600'], ARRAY['sunset', 'nature', 'photography', 'peaceful'], ARRAY[], 156, 23, 15, 2100, NOW() - INTERVAL '4 hours'),

('tweet-003', 'Hot take: TypeScript makes JavaScript development so much better. The type safety alone saves hours of debugging! 💯 #typescript #javascript #programming #developer', '550e8400-e29b-41d4-a716-446655440003', ARRAY[], ARRAY['typescript', 'javascript', 'programming', 'developer'], ARRAY[], 89, 34, 22, 1800, NOW() - INTERVAL '6 hours'),

('tweet-004', 'Made the most incredible pasta carbonara tonight! 🍝 The secret is in the timing and using real Parmigiano-Reggiano. Recipe coming soon! #cooking #pasta #italian #foodie', '550e8400-e29b-41d4-a716-446655440004', ARRAY['https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600'], ARRAY['cooking', 'pasta', 'italian', 'foodie'], ARRAY[], 78, 15, 12, 950, NOW() - INTERVAL '8 hours'),

('tweet-005', 'Currently writing this from a café in Tokyo! ☕️ The energy here is incredible. Next stop: Kyoto temples 🏯 #travel #tokyo #japan #digitalnomad', '550e8400-e29b-41d4-a716-446655440005', ARRAY['https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=600'], ARRAY['travel', 'tokyo', 'japan', 'digitalnomad'], ARRAY[], 203, 45, 28, 3200, NOW() - INTERVAL '10 hours'),

('tweet-006', 'Morning workout complete! 💪 Remember: consistency beats perfection every time. Small steps lead to big changes. What''s your fitness goal for this week? #fitness #motivation #health #workout', '550e8400-e29b-41d4-a716-446655440006', ARRAY[], ARRAY['fitness', 'motivation', 'health', 'workout'], ARRAY[], 67, 18, 24, 890, NOW() - INTERVAL '12 hours'),

('tweet-007', 'Working on a new React component library! 📚 Open source is the way to go. Shoutout to @techdev for the amazing tutorials! #opensource #react #components #community', '550e8400-e29b-41d4-a716-446655440003', ARRAY[], ARRAY['opensource', 'react', 'components', 'community'], ARRAY['techdev'], 95, 28, 16, 1400, NOW() - INTERVAL '14 hours'),

('tweet-008', 'Captured this amazing wildlife shot during my morning hike! 🦅 Nature never ceases to amaze me. #wildlife #photography #hiking #nature', '550e8400-e29b-41d4-a716-446655440002', ARRAY['https://images.pexels.com/photos/1661179/pexels-photo-1661179.jpeg?auto=compress&cs=tinysrgb&w=600'], ARRAY['wildlife', 'photography', 'hiking', 'nature'], ARRAY[], 134, 31, 19, 1650, NOW() - INTERVAL '16 hours'),

('tweet-009', 'Pro tip: Meal prep on Sundays saves so much time during the week! 🥗 Here''s my go-to healthy meal prep guide. Thanks @fitness_coach for the nutrition advice! #mealprep #healthy #nutrition #productivity', '550e8400-e29b-41d4-a716-446655440004', ARRAY['https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600'], ARRAY['mealprep', 'healthy', 'nutrition', 'productivity'], ARRAY['fitness_coach'], 112, 22, 31, 1320, NOW() - INTERVAL '18 hours'),

('tweet-010', 'The cherry blossoms in Kyoto are absolutely breathtaking! 🌸 Sometimes you have to travel halfway around the world to find peace. #kyoto #cherryblossom #japan #travel #zen', '550e8400-e29b-41d4-a716-446655440005', ARRAY['https://images.pexels.com/photos/2070033/pexels-photo-2070033.jpeg?auto=compress&cs=tinysrgb&w=600'], ARRAY['kyoto', 'cherryblossom', 'japan', 'travel', 'zen'], ARRAY[], 287, 56, 42, 4100, NOW() - INTERVAL '20 hours')
ON CONFLICT (id) DO NOTHING;