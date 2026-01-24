-- Fase 1: Estrutura Multi-Empreendimentos

-- 1.1 Criar tabela de empreendimentos
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pre_launch',
  is_active BOOLEAN NOT NULL DEFAULT true,
  hero_title TEXT,
  hero_subtitle TEXT,
  features JSONB,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Criar tabela de associação corretor-empreendimento
CREATE TABLE public.broker_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(broker_id, project_id)
);

-- 1.3 Adicionar project_id nas tabelas existentes
ALTER TABLE public.leads ADD COLUMN project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.page_views ADD COLUMN project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.lead_attribution ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- 1.4 Índices para performance
CREATE INDEX idx_leads_project_id ON public.leads(project_id);
CREATE INDEX idx_page_views_project_id ON public.page_views(project_id);
CREATE INDEX idx_broker_projects_broker ON public.broker_projects(broker_id);
CREATE INDEX idx_broker_projects_project ON public.broker_projects(project_id);

-- 1.5 Trigger para updated_at em projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_updated_at();

-- 1.6 Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_projects ENABLE ROW LEVEL SECURITY;

-- 1.7 Políticas RLS para projects
CREATE POLICY "Projetos ativos são públicos"
  ON public.projects FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar projetos"
  ON public.projects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.8 Políticas RLS para broker_projects
CREATE POLICY "Corretores veem suas associações"
  ON public.broker_projects FOR SELECT
  USING (
    broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins gerenciam associações"
  ON public.broker_projects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.9 Inserir projeto inicial (Estância Velha)
INSERT INTO public.projects (name, slug, city, status, is_active, hero_title, hero_subtitle)
VALUES (
  'Condomínio Alto Padrão Estância Velha',
  'estanciavelha',
  'Estância Velha',
  'pre_launch',
  true,
  'Seu Futuro Endereço de Alto Padrão',
  'Terrenos a partir de 500m² em condomínio fechado'
);

-- 1.10 Associar leads existentes ao projeto Estância Velha
UPDATE public.leads 
SET project_id = (SELECT id FROM public.projects WHERE slug = 'estanciavelha')
WHERE project_id IS NULL;

-- 1.11 Associar corretores ativos ao projeto Estância Velha
INSERT INTO public.broker_projects (broker_id, project_id)
SELECT b.id, p.id 
FROM public.brokers b
CROSS JOIN public.projects p
WHERE b.is_active = true AND p.slug = 'estanciavelha'
ON CONFLICT (broker_id, project_id) DO NOTHING;