/*
  # Storage Setup for Tweet Images

  1. Storage Bucket
    - Creates `tweet-images` bucket for storing user-uploaded images
    - Sets 10MB file size limit
    - Allows common image formats (JPEG, PNG, GIF, WebP)

  2. Security Policies
    - Upload: Users can only upload to their own folder
    - Read: Public access for viewing images
    - Delete: Users can only delete their own images
    - Update: Users can only update their own images

  3. Folder Structure
    - Images stored as: {user_id}/{filename}
    - Ensures user isolation while allowing public read access
*/

-- Create the tweet-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tweet-images',
  'tweet-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
  -- Drop upload policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload images to own folder'
  ) THEN
    DROP POLICY "Users can upload images to own folder" ON storage.objects;
  END IF;

  -- Drop read policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view tweet images'
  ) THEN
    DROP POLICY "Anyone can view tweet images" ON storage.objects;
  END IF;

  -- Drop delete policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own images'
  ) THEN
    DROP POLICY "Users can delete own images" ON storage.objects;
  END IF;

  -- Drop update policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own images'
  ) THEN
    DROP POLICY "Users can update own images" ON storage.objects;
  END IF;
END $$;

-- Policy: Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload images to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tweet-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public read access to all tweet images
CREATE POLICY "Anyone can view tweet images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tweet-images');

-- Policy: Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tweet-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow authenticated users to update their own images
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tweet-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);