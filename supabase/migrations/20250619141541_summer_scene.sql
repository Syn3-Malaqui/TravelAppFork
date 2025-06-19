/*
  # Storage bucket and policies for tweet images

  1. Storage Setup
    - Create tweet-images bucket if it doesn't exist
    - Set up public access and file size limits
    - Configure allowed MIME types for images

  2. Security Policies
    - Users can upload images to their own folder
    - Public read access for all tweet images
    - Users can manage (update/delete) their own images
*/

-- Create the tweet-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tweet-images',
  'tweet-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload images to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tweet images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;

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