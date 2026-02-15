
-- Add commercial tracking columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_agendamento timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tipo_agendamento text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS comparecimento boolean;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS valor_proposta numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_envio_proposta timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS valor_final_venda numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_fechamento timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_perda timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS etapa_perda text;

-- Add new interaction types to the enum
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'agendamento_registrado';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'comparecimento_registrado';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'proposta_enviada';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'venda_confirmada';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'reagendamento';
