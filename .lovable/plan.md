

## Melhorias nas Etapas de Campanha: Delays Rapidos + Controle de Resposta

### O que muda

**1. Novos presets de delay rapido**
Adicionar opcoes de "1 minuto" e "5 minutos" no seletor de delay entre etapas, alem das opcoes existentes (30 min, 1h, etc.).

**2. Seletor "Enviar mesmo se o lead responder"**
Cada etapa adicional (etapa 2+) ganha um toggle (Switch) com duas opcoes:
- **Desligado (padrao)**: "Nao enviar se o lead responder" -- a etapa e cancelada se o lead ja respondeu
- **Ligado**: "Enviar mesmo que o lead responda" -- a etapa e enviada independente de resposta

### Detalhes tecnicos

**Arquivo: `src/components/whatsapp/NewCampaignSheet.tsx`**

1. Adicionar `{ label: "1 minuto", minutes: 1 }` e `{ label: "5 minutos", minutes: 5 }` ao array `DELAY_PRESETS` (antes do "30 minutos")
2. Alterar o default de `delayMinutes` no `addStep` de `1440` para `5` (mais intuitivo para mensagens rapidas)
3. Adicionar um Switch abaixo do seletor de delay nas etapas 2+ com label "Enviar mesmo se o lead responder"
4. Importar o componente `Switch`
5. Passar o campo `sendIfReplied` para os steps no submit

**Arquivo: `src/types/whatsapp.ts`**

6. Adicionar campo `sendIfReplied?: boolean` ao type `CampaignStepInput`

**Arquivo: `src/hooks/use-whatsapp-campaigns.ts`**

7. Incluir `send_if_replied` no objeto `stepsToInsert` ao inserir na tabela `campaign_steps`
8. Incluir `send_if_replied` no queue item para que o sender possa checar antes de enviar

### Layout visual da etapa

```text
+--------------------------------------+
| Etapa 2                         [X]  |
+--------------------------------------+
| Enviar apos: [5 minutos         v]   |
|                                      |
| [ ] Enviar mesmo se o lead responder |
|                                      |
| [Template] [Personalizada]           |
| [Selecione um template         v]    |
|                                      |
| Previa: ...                          |
+--------------------------------------+
```

### O que NAO muda
- Etapa 1 continua sem delay e sem o toggle (sempre envia)
- Logica de opt-out, warmup e intervalos aleatorios permanece igual
- Lista de leads e filtros nao sao afetados

