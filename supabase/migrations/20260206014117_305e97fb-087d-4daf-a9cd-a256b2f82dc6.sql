-- Create function for updating timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_global_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to store global WhatsApp instance configuration
CREATE TABLE public.global_whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL,
  instance_token TEXT NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write this table
CREATE POLICY "Admins can manage global whatsapp config" 
ON public.global_whatsapp_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Edge functions need service role access (bypasses RLS)
-- So we don't need a special policy for that

-- Create trigger for updated_at
CREATE TRIGGER update_global_whatsapp_config_updated_at
BEFORE UPDATE ON public.global_whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION public.update_global_config_updated_at();