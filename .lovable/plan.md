

# Cadencia ativa: mover lead + contorno verde piscando (1s)

## Alteracoes

### 1. KanbanCard.tsx - Contorno verde piscando com animacao de 1s

Na div principal do card (linha 157-167), adicionar classe condicional quando `hasCadenciaAtiva` for true:
- `hasCadenciaAtiva && !isNew && "ring-2 ring-emerald-400/60 animate-[pulse_1s_ease-in-out_infinite]"`
- Ajustar `isStale` para nao aplicar ring vermelho quando cadencia ativa: `isStale && !hasCadenciaAtiva && "ring-2 ring-red-400/50"`

### 2. CadenciaSheet.tsx - Nova prop `leadStatus` + mover lead para Atendimento

- Adicionar prop opcional `leadStatus?: string` na interface
- Receber no destructuring do componente
- Apos criar a campanha e agendar mensagens, se `leadStatus === "new"`, executar:
  - Update do lead para `status: "info_sent"`, `atendimento_iniciado_em: now`, `status_distribuicao: "accepted"`
  - Insert de log na timeline: "Lead movido para Atendimento ao ativar Cadencia 10D"

### 3. LeadPage.tsx - Passar leadStatus ao CadenciaSheet

Na chamada do `<CadenciaSheet>` (linha 796), adicionar prop `leadStatus={lead.status}`.

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Editar | `src/components/crm/KanbanCard.tsx` (contorno verde 1s) |
| Editar | `src/components/crm/CadenciaSheet.tsx` (prop leadStatus + mover lead) |
| Editar | `src/pages/LeadPage.tsx` (passar leadStatus) |

## Detalhes tecnicos

- A animacao usa `animate-[pulse_1s_ease-in-out_infinite]` (Tailwind arbitrary animation) para pulsar a cada 1 segundo
- O contorno verde da cadencia so aparece quando `!isNew` para nao conflitar com o ring de lead novo
- O ring vermelho de `isStale` tambem e suprimido quando cadencia ativa para evitar conflito visual
- A transicao de status reutiliza os mesmos campos que `iniciarAtendimento` do `use-kanban-leads.ts`

