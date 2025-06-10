/*
  # Add country field to profiles

  1. Changes
    - Add `country` column to profiles table to store user's selected country
    - Set default value to 'US' for existing users
    - Add index for better performance on country-based queries

  2. Security
    - No changes to RLS policies needed
*/

-- Add country column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country text DEFAULT 'US';
  END IF;
END $$;

-- Add index for country-based queries
CREATE INDEX IF NOT EXISTS profiles_country_idx ON profiles(country);

-- Update the handle_new_user function to include country
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, country)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'country', 'US')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;