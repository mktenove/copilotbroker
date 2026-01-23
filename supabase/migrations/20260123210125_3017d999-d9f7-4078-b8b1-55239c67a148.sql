-- Adicionar novo tipo de interação para rastrear alterações de origem
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'origin_change';