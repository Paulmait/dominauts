-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- This creates storage buckets for avatars and game assets
-- Run AFTER security policies

-- ================================================
-- CREATE STORAGE BUCKETS
-- ================================================

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket for avatars
  false,
  1048576, -- 1MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create game-assets bucket for game resources
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'game-assets',
  'game-assets',
  true, -- Public bucket for game assets
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'audio/mpeg', 'audio/wav'];

-- Create replays bucket for game replays (private)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'replays',
  'replays',
  false, -- Private bucket
  false,
  10485760, -- 10MB limit
  ARRAY['application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/json'];

-- ================================================
-- STORAGE POLICIES FOR AVATARS
-- ================================================

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to view avatars (since bucket is public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- ================================================
-- STORAGE POLICIES FOR GAME ASSETS
-- ================================================

-- Only admins can upload game assets
CREATE POLICY "Admins can upload game assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'game-assets' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can update game assets
CREATE POLICY "Admins can update game assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'game-assets' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can delete game assets
CREATE POLICY "Admins can delete game assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'game-assets' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can view game assets (public bucket)
CREATE POLICY "Anyone can view game assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-assets');

-- ================================================
-- STORAGE POLICIES FOR REPLAYS
-- ================================================

-- Users can upload their own replays
CREATE POLICY "Users can upload own replays"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'replays' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own replays
CREATE POLICY "Users can view own replays"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'replays' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own replays
CREATE POLICY "Users can delete own replays"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'replays' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ================================================
-- HELPER FUNCTIONS FOR STORAGE
-- ================================================

-- Function to get user's avatar URL
CREATE OR REPLACE FUNCTION get_avatar_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_url TEXT;
  avatar_path TEXT;
BEGIN
  -- Get Supabase project URL
  SELECT current_setting('app.settings.supabase_url', true) INTO base_url;

  -- Construct avatar path
  avatar_path := 'avatars/' || user_id::text || '/avatar.png';

  -- Return full URL
  RETURN base_url || '/storage/v1/object/public/' || avatar_path;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old avatars when uploading new one
CREATE OR REPLACE FUNCTION cleanup_old_avatars()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old avatars for the same user (keep only latest)
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (storage.foldername(NEW.name))[1]
    AND id != NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for avatar cleanup
DROP TRIGGER IF EXISTS cleanup_old_avatars_trigger ON storage.objects;
CREATE TRIGGER cleanup_old_avatars_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'avatars')
  EXECUTE FUNCTION cleanup_old_avatars();

-- ================================================
-- VERIFY STORAGE SETUP
-- ================================================

-- List all buckets
SELECT * FROM storage.buckets;

-- List storage policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;