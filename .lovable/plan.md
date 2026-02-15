
# Adicionar campo de Data/Hora de inicio ao Follow-Up

## O que muda

Atualmente a primeira mensagem do follow-up e agendada para "agora" (com um pequeno intervalo aleatorio). O corretor precisa poder escolher **quando** o follow-up comeca.

## Alteracoes

### Arquivo: `src/components/crm/FollowUpSheet.tsx`

1. **Novo estado** `startDate` (Date | undefined) e `startTime` (string, formato "HH:mm") -- resetados ao abrir o sheet.

2. **Nova secao visual** acima das etapas, com titulo "Inicio do envio":
   - DatePicker usando `Popover` + `Calendar` (mesmo padrao do `AgendamentoModal`)
   - Input de horario (type="time") ao lado da data
   - Opcao rapida "Enviar agora" como alternativa (botao toggle)
   - Quando "Enviar agora" esta selecionado, os campos de data/hora ficam desabilitados

3. **Validacao atualizada**: `isValid` passa a exigir que `startDate` esteja preenchido OU que "Enviar agora" esteja ativo.

4. **Logica de agendamento** (`handleSubmit`): em vez de `Date.now() + getRandomInterval()`, o `scheduledTime` inicial sera calculado a partir da data+hora selecionada. Se "Enviar agora", mantem o comportamento atual.

### Detalhes de UI

- A secao de data/hora segue o mesmo estilo dark do sheet (bg-[#0f0f11], border-[#2a2a2e])
- Data formatada em dd/MM/yyyy, horario em formato 24h
- Default ao abrir: "Enviar agora" ativo (comportamento atual preservado)
- Ao desmarcar "Enviar agora", os campos de data/hora aparecem com a data de hoje e horario atual como default

### Fluxo

```text
[Corretor abre Follow-Up]
       |
  [Secao: Inicio do envio]
  [x] Enviar agora   -- ou --   [ Data: 18/02/2026 ] [ Hora: 14:30 ]
       |
  [Etapa 1 - mensagem]
  [Etapa 2 - delay + mensagem]
       |
  [Agendar Follow-Up]
```

Nenhuma alteracao de banco necessaria -- o campo `scheduled_at` na `whatsapp_message_queue` ja aceita qualquer timestamp futuro.
