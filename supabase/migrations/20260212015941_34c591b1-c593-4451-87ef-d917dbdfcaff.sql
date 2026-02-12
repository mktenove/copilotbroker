
-- Migração 1: Apenas adicionar novos valores aos enums existentes
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'leader';
ALTER TYPE public.interaction_type ADD VALUE IF NOT EXISTS 'roleta_atribuicao';
ALTER TYPE public.interaction_type ADD VALUE IF NOT EXISTS 'roleta_timeout';
ALTER TYPE public.interaction_type ADD VALUE IF NOT EXISTS 'roleta_fallback';
ALTER TYPE public.interaction_type ADD VALUE IF NOT EXISTS 'roleta_transferencia';
ALTER TYPE public.interaction_type ADD VALUE IF NOT EXISTS 'atendimento_iniciado';
