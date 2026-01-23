-- Adicionar status 'inactive' ao enum lead_status
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'inactive';

-- Adicionar tipo de interação 'inactivation' ao enum interaction_type
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'inactivation';

-- Adicionar colunas de inativação na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inactivation_reason TEXT DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inactivated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inactivated_by UUID DEFAULT NULL;