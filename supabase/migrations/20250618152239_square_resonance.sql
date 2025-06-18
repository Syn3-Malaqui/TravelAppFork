/*
  # Create tweet-images storage bucket

  1. Storage Setup
    - Create tweet-images bucket for storing tweet image attachments
    - Configure bucket as public with file size and type restrictions

  2. Note
    - Storage policies must be created through Supabase Dashboard or CLI
    - Direct policy creation on storage.objects requires superuser privileges
*/

-- Create the tweet-images bucket if it doesn't exist
DO $$
BEGIN
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

-- Create a helper function for folder-based access control
CREATE OR REPLACE FUNCTION public.get_user_folder_from_path(file_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT split_part(file_path, '/', 1);
$$;

-- Grant necessary permissions for storage access
DO $$
BEGIN
  -- Grant usage on storage schema to authenticated users
  GRANT USAGE ON SCHEMA storage TO authenticated;
  
  -- Note: Storage policies must be created through Supabase Dashboard
  -- Required policies for tweet-images bucket:
  -- 1. "Users can upload images to own folder" - INSERT policy for authenticated users
  --    WITH CHECK: bucket_id = 'tweet-images' AND auth.uid()::text = (storage.foldername(name))[1]
  -- 2. "Anyone can view tweet images" - SELECT policy for public
  --    USING: bucket_id = 'tweet-images'
  -- 3. "Users can delete own images" - DELETE policy for authenticated users
  --    USING: bucket_id = 'tweet-images' AND auth.uid()::text = (storage.foldername(name))[1]
  -- 4. "Users can update own images" - UPDATE policy for authenticated users
  --    USING: bucket_id = 'tweet-images' AND auth.uid()::text = (storage.foldername(name))[1]
END $$;