-- Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'broker');

-- Criar tabela user_roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS na user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função security definer para verificar role (evita recursão infinita)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar tabela brokers
CREATE TABLE public.brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    whatsapp TEXT,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na brokers
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

-- Trigger para atualizar updated_at na brokers
CREATE TRIGGER update_brokers_updated_at
    BEFORE UPDATE ON public.brokers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_leads_updated_at();

-- Adicionar colunas broker_id e source na tabela leads
ALTER TABLE public.leads 
ADD COLUMN broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
ADD COLUMN source TEXT NOT NULL DEFAULT 'enove';

-- Políticas RLS para user_roles
CREATE POLICY "Admins podem ver todas as roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver sua própria role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Apenas admins podem inserir roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem deletar roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para brokers
CREATE POLICY "Qualquer pessoa pode ver corretores ativos"
ON public.brokers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins podem ver todos os corretores"
ON public.brokers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Corretores podem ver seu próprio perfil"
ON public.brokers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Apenas admins podem inserir corretores"
ON public.brokers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem atualizar corretores"
ON public.brokers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem deletar corretores"
ON public.brokers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar políticas RLS para leads
DROP POLICY IF EXISTS "Somente autenticados podem visualizar leads" ON public.leads;

CREATE POLICY "Admins podem ver todos os leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Corretores podem ver seus próprios leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'broker') 
    AND broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
);