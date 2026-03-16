-- Update project-media bucket: 50 MB limit, allow common video formats
UPDATE storage.buckets
SET
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/mpeg', 'video/x-m4v',
    'video/x-matroska', 'video/webm', 'video/3gpp', 'video/ogg'
  ]
WHERE id = 'project-media';
