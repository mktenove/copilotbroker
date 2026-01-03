-- Criar tabela de leads para o cadastro do empreendimento
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção pública (sem autenticação)
CREATE POLICY "Permitir inserção pública de leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Política para leitura apenas por usuários autenticados (para gestão futura)
CREATE POLICY "Somente autenticados podem visualizar leads" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();