/*
  # Add cover image support to profiles

  1. Changes
    - Add `cover_image` column to profiles table to store cover image URLs
    - Update existing profiles to have null cover images by default

  2. Security
    - No changes to RLS policies needed
    - Cover images will be stored in the same tweet-images bucket
*/

-- Add cover_image column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cover_image text;
  END IF;
END $$;

-- Update the handle_new_user function to include cover_image
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, country, cover_image)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'country', 'US'),
    null
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;