-- Adicionar coluna city_slug na tabela projects
ALTER TABLE public.projects ADD COLUMN city_slug text;

-- Atualizar projetos existentes com seus city_slugs
UPDATE public.projects SET city_slug = 'estancia-velha' WHERE slug = 'estanciavelha';
UPDATE public.projects SET city_slug = 'portao' WHERE slug = 'goldenview';

-- Criar índice para buscas eficientes por cidade
CREATE INDEX idx_projects_city_slug ON public.projects(city_slug);

-- Garantir unicidade de slug dentro de cada cidade (apenas para projetos ativos)
CREATE UNIQUE INDEX idx_projects_city_project_slug ON public.projects(city_slug, slug) WHERE is_active = true;