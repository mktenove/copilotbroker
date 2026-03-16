-- Create public bucket for project media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media',
  true,
  104857600, -- 100 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (needed for public landing pages)
CREATE POLICY "public_read_project_media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-media');

-- Authenticated users can upload
CREATE POLICY "authenticated_upload_project_media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-media');

-- Authenticated users can update (upsert)
CREATE POLICY "authenticated_update_project_media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-media');

-- Authenticated users can delete
CREATE POLICY "authenticated_delete_project_media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-media');
