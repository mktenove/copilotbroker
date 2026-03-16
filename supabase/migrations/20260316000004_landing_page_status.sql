-- Add landing_page_status to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS landing_page_status TEXT DEFAULT 'draft'
    CHECK (landing_page_status IN ('draft', 'published'));
