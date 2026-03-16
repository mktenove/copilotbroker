-- Platform-wide settings controlled by super admins
CREATE TABLE public.platform_settings (
  key   TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins (super admins) can read/write
CREATE POLICY "admin_full_access_platform_settings"
ON public.platform_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Seed defaults
INSERT INTO public.platform_settings (key, value) VALUES
  ('ai_provider',       'anthropic'),
  ('anthropic_model',   'claude-sonnet-4-6'),
  ('openai_model',      'gpt-4o'),
  ('gemini_model',      'gemini-2.0-flash')
ON CONFLICT (key) DO NOTHING;
