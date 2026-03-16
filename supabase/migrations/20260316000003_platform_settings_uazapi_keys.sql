-- Ensure Uazapi keys exist in platform_settings with empty defaults
INSERT INTO public.platform_settings (key, value) VALUES
  ('uazapi_instance_url', ''),
  ('uazapi_token',        ''),
  ('uazapi_admin_token',  '')
ON CONFLICT (key) DO NOTHING;
