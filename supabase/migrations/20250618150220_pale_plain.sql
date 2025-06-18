/*
  # Create tweet-images storage bucket

  1. Storage Setup
    - Create `tweet-images` bucket for storing user uploaded images
    - Configure bucket to be publicly accessible for reading
    - Set up RLS policies for secure upload/delete operations

  2. Security
    - Enable RLS on the bucket
    - Allow authenticated users to upload images to their own folder
    - Allow authenticated users to delete their own images
    - Allow public read access to all images

  3. Configuration
    - Set appropriate file size limits
    - Configure allowed file types for images
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

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload images to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tweet-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow authenticated users to view all images (public read)
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