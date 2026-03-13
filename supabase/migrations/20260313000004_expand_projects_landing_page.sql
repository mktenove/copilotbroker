-- Expand projects table with property details and landing page data
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
  ADD COLUMN IF NOT EXISTS suites INTEGER,
  ADD COLUMN IF NOT EXISTS parking_spots INTEGER,
  ADD COLUMN IF NOT EXISTS area_m2 NUMERIC,
  ADD COLUMN IF NOT EXISTS price_range TEXT,
  ADD COLUMN IF NOT EXISTS ideal_buyer TEXT,
  ADD COLUMN IF NOT EXISTS amenities TEXT[],
  ADD COLUMN IF NOT EXISTS differentials TEXT,
  ADD COLUMN IF NOT EXISTS main_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS map_embed_url TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_data JSONB,
  ADD COLUMN IF NOT EXISTS landing_page_generated_at TIMESTAMPTZ;
