
# Corrigir Motor de Agendamento da Cadencia - Respeitar Janela de Envio

## Problema Atual

Quando uma mensagem da cadencia e agendada para fora da janela permitida (ex: 23h), ela fica bloqueada ate as 9h do dia seguinte. Como todas as etapas sao calculadas com base no horario original (sem considerar a janela), varias mensagens vencem ao mesmo tempo e sao disparadas em lote as 9h.

## Solucao

Implementar logica de ajuste de horario no momento do agendamento (tanto automatico quanto manual), e tambem no processador de fila para recalcular etapas futuras apos cada envio real.

## Alteracoes

### 1. Edge Function: `supabase/functions/auto-cadencia-10d/index.ts`

Adicionar funcao `adjustToWorkingHours` que:
- Recebe um `Date` e a janela de horario (start/end) do corretor
- Se o horario estiver dentro da janela, retorna como esta
- Se estiver fora, move para o proximo horario valido (inicio da janela do mesmo dia se antes, ou inicio da janela do dia seguinte se depois)

Modificar o bloco de agendamento (linhas 233-253):
- Buscar `working_hours_start` e `working_hours_end` da instancia do corretor (ja disponivel na query da linha 155)
- Para cada etapa, apos calcular `scheduledTime`, aplicar `adjustToWorkingHours`
- Usar o horario ajustado como base para calcular a proxima etapa (encadeamento sequencial)
- Registrar no log quando houver ajuste

### 2. Componente: `src/components/crm/CadenciaSheet.tsx`

Mesma logica para ativacao manual:
- Buscar `working_hours_start` e `working_hours_end` da instancia do corretor (adicionar query)
- Aplicar `adjustToWorkingHours` em cada etapa ao agendar
- Encadear cada etapa com base no horario ajustado da anterior

### 3. Edge Function: `supabase/functions/whatsapp-message-sender/index.ts`

Adicionar logica de recalculo pos-envio:
- Apos enviar com sucesso uma mensagem de campanha (com `step_number` e `campaign_id`), verificar se a proxima etapa precisa ser reagendada
- Buscar a proxima mensagem agendada da mesma campanha
- Recalcular seu `scheduled_at` com base no horario real de envio + delay da etapa + ajuste de janela
- Registrar no log o recalculo com horario original e ajustado

### Detalhes Tecnicos

#### Funcao `adjustToWorkingHours`

```text
Entrada: scheduledDate, workingHoursStart (ex: "09:00"), workingHoursEnd (ex: "21:00")
Saida: Date ajustado

Logica (em BRT = UTC-3):
1. Converter scheduledDate para BRT
2. Extrair hora:minuto
3. Se hora >= start E hora <= end: retornar sem alteracao
4. Se hora > end: mover para start do DIA SEGUINTE
5. Se hora < start: mover para start do MESMO DIA
6. Converter de volta para UTC e retornar
```

#### Recalculo no message-sender (pos-envio)

Apos enviar step N com sucesso:
1. Buscar step N+1 na `whatsapp_message_queue` (mesma campaign, step_number = N+1, status = scheduled)
2. Buscar `delay_minutes` do step N+1 na `campaign_steps`
3. Calcular novo horario: `sent_at + delay_minutes`
4. Aplicar `adjustToWorkingHours`
5. Atualizar `scheduled_at` da mensagem N+1
6. Registrar interacao no lead: "Proxima etapa reagendada de HH:mm para HH:mm (fora da janela permitida)"

#### Log de ajuste

Quando houver ajuste, registrar em `lead_interactions`:
```text
interaction_type: "note_added"
notes: "⏰ Etapa X reagendada: previsto HH:mm DD/MM → ajustado para HH:mm DD/MM (fora da janela permitida HH:mm-HH:mm)"
```

### Arquivos modificados

1. `supabase/functions/auto-cadencia-10d/index.ts` - agendamento inteligente na criacao
2. `supabase/functions/whatsapp-message-sender/index.ts` - recalculo pos-envio
3. `src/components/crm/CadenciaSheet.tsx` - agendamento inteligente na ativacao manual
