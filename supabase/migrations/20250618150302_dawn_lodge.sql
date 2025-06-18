/*
  # Create tweet-images storage bucket

  1. Storage Setup
    - Create tweet-images bucket for storing tweet image attachments
    - Configure bucket as public with file size and type restrictions
    - Set up RLS policies for secure access

  2. Security
    - Users can upload images to their own folders
    - Public read access for all images
    - Users can only delete/update their own images
*/

-- Create the tweet-images bucket using Supabase's storage functions
DO $$
BEGIN
  -- Check if bucket already exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'tweet-images'
  ) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (
      id, 
      name, 
      public, 
      file_size_limit, 
      allowed_mime_types,
      created_at,
      updated_at
    ) VALUES (
      'tweet-images',
      'tweet-images',
      true,
      10485760, -- 10MB limit
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- Create storage policies using Supabase's policy functions
-- Note: These policies will be created in the storage schema

-- Policy: Allow authenticated users to upload images to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload images to own folder'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload images to own folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = ''tweet-images'' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;
END $$;

-- Policy: Allow public read access to tweet images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view tweet images'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view tweet images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = ''tweet-images'')';
  END IF;
END $$;

-- Policy: Allow authenticated users to delete their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = ''tweet-images'' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;
END $$;

-- Policy: Allow authenticated users to update their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = ''tweet-images'' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;
END $$;