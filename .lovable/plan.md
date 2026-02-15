
# Transferencia Manual de Leads entre Corretores

## O que sera implementado
Um botao "Transferir Lead" no painel de detalhes do lead (LeadDetailSheet) que abre um dialog com a lista de corretores disponiveis. Ao selecionar o corretor destino e confirmar, o lead sera transferido, registrando a acao na timeline.

## Como vai funcionar
1. O usuario abre os detalhes de um lead no Kanban
2. Clica em "Transferir" nas acoes rapidas
3. Um dialog aparece com a lista de corretores ativos
4. O usuario seleciona o corretor destino e confirma
5. O lead desaparece do Kanban do corretor antigo (via Realtime ja implementado) e aparece no Kanban do novo corretor
6. A transferencia e registrada na timeline do lead

## Detalhes Tecnicos

### 1. Migracao: Nova RLS policy para permitir transferencia
Os corretores atualmente so podem atualizar seus proprios leads. Precisamos de uma funcao SECURITY DEFINER para transferir leads de forma segura, sem abrir permissoes demais:

```sql
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
  
  -- Verificar permissao: admin, ou dono do lead, ou leader do dono
  IF NOT _is_admin 
     AND _caller_broker_id IS DISTINCT FROM _old_broker_id
     AND NOT EXISTS (
       SELECT 1 FROM brokers 
       WHERE id = _old_broker_id AND lider_id = _caller_broker_id
     )
  THEN
    RAISE EXCEPTION 'Sem permissao para transferir este lead';
  END IF;
  
  -- Atualizar o lead
  UPDATE leads SET 
    broker_id = _new_broker_id,
    updated_at = now(),
    status_distribuicao = NULL,
    reserva_expira_em = NULL
  WHERE id = _lead_id;
  
  -- Registrar na timeline
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
```

### 2. Novo componente: TransferLeadDialog
Um dialog simples com:
- Select/combobox para escolher o corretor destino
- Lista dos corretores ativos (excluindo o atual)
- Botao de confirmar

### 3. Alteracoes no LeadDetailSheet
- Adicionar botao "Transferir" na secao de Acoes Rapidas
- Ao clicar, abre o TransferLeadDialog
- Ao confirmar, chama `supabase.rpc('transfer_lead', { ... })`
- Fecha o dialog e o sheet, o Realtime cuida de atualizar os Kanbans

### 4. Alteracoes no KanbanBoard
- Passar a lista de `brokers` para o LeadDetailSheet (ja disponivel via props)
- Adicionar callback `onTransfer` que chama a RPC e faz refetch
