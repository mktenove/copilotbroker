-- Add scraped_images to projects so they persist for re-generation in editor
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scraped_images TEXT[] DEFAULT '{}';
