/*
  # Add tags support to tweets table

  1. Changes
    - Add `tags` column to tweets table as text array
    - Update existing tweets to have empty tags array by default
    - Add index for better performance on tag queries

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add tags column to tweets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tweets' AND column_name = 'tags'
  ) THEN
    ALTER TABLE tweets ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;

-- Create index for better performance on tag queries
CREATE INDEX IF NOT EXISTS tweets_tags_idx ON tweets USING GIN (tags);

-- Update existing tweets to have empty tags array
UPDATE tweets SET tags = '{}' WHERE tags IS NULL;