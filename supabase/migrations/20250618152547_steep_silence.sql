/*
  # Add cover image support to profiles

  1. Changes
    - Add cover_image column to profiles table
    - Update existing policies to include cover_image field

  2. Security
    - Existing RLS policies will automatically apply to the new column
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