
CREATE OR REPLACE FUNCTION public.transfer_lead(
  _lead_id uuid,
  _new_broker_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_broker_id uuid;
  _caller_broker_id uuid;
  _is_admin boolean;
BEGIN
  _is_admin := has_role(auth.uid(), 'admin');
  
  SELECT id INTO _caller_broker_id 
  FROM brokers WHERE user_id = auth.uid() LIMIT 1;
  
  SELECT broker_id INTO _old_broker_id 
  FROM leads WHERE id = _lead_id;
  
  IF NOT _is_admin 
     AND _caller_broker_id IS DISTINCT FROM _old_broker_id
     AND NOT EXISTS (
       SELECT 1 FROM brokers 
       WHERE id = _old_broker_id AND lider_id = _caller_broker_id
     )
  THEN
    RAISE EXCEPTION 'Sem permissao para transferir este lead';
  END IF;
  
  UPDATE leads SET 
    broker_id = _new_broker_id,
    updated_at = now(),
    status_distribuicao = NULL,
    reserva_expira_em = NULL
  WHERE id = _lead_id;
  
  INSERT INTO lead_interactions (lead_id, interaction_type, notes, created_by)
  VALUES (
    _lead_id, 
    'roleta_transferencia',
    'Lead transferido manualmente de corretor ' || 
      COALESCE((SELECT name FROM brokers WHERE id = _old_broker_id), 'Enove') || 
      ' para ' || 
      (SELECT name FROM brokers WHERE id = _new_broker_id),
    auth.uid()
  );
END;
$$;
