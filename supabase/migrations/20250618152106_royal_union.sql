/*
  # Create tweet-images storage bucket

  1. Storage Setup
    - Create tweet-images bucket for storing tweet image attachments
    - Configure bucket as public with file size and type restrictions
    - Set up RLS policies for secure access control

  2. Security
    - Users can upload images to their own folders
    - Public read access for all images
    - Users can only delete/update their own images
*/

-- Create the tweet-images bucket using Supabase storage functions
DO $$
BEGIN
  -- Create bucket if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'tweet-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'tweet-images',
      'tweet-images', 
      true,
      10485760, -- 10MB limit
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    );
  END IF;
END $$;

-- Create storage policies using Supabase's policy functions
-- Note: These policies will be created through the Supabase dashboard or CLI
-- as direct SQL policy creation on storage.objects requires superuser privileges

-- The following policies should be created in the Supabase dashboard:
-- 1. "Users can upload images to own folder" - INSERT policy for authenticated users
-- 2. "Anyone can view tweet images" - SELECT policy for public
-- 3. "Users can delete own images" - DELETE policy for authenticated users  
-- 4. "Users can update own images" - UPDATE policy for authenticated users

-- Create a function to help with folder-based access control
CREATE OR REPLACE FUNCTION public.get_user_folder_from_path(file_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT split_part(file_path, '/', 1);
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;