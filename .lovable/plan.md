
# Modulo: Cadencia Automatica 10D

## Resumo

Criar um sistema de cadencia de mensagens automaticas na pagina do Lead, reutilizando a infraestrutura existente de campanhas/follow-up (tabelas `whatsapp_campaigns`, `campaign_steps`, `whatsapp_message_queue`, `whatsapp_lead_replies`). O sistema adiciona indicadores visuais no Kanban e na pagina do Lead para cadencias ativas, com controle de cancelamento.

## Arquitetura

O sistema reutiliza 100% da infraestrutura existente:
- `whatsapp_campaigns` armazena a cadencia (com um campo `lead_id` novo para identificar cadencias individuais)
- `campaign_steps` armazena as etapas
- `whatsapp_message_queue` agenda os envios
- `whatsapp_lead_replies` detecta respostas e cancela etapas futuras (ja implementado no webhook)

## Alteracoes

### 1. Migration SQL

Adicionar coluna `lead_id` na tabela `whatsapp_campaigns` para identificar cadencias individuais e permitir consultas rapidas:

```sql
ALTER TABLE public.whatsapp_campaigns ADD COLUMN lead_id uuid;
```

Isso permite consultar `SELECT * FROM whatsapp_campaigns WHERE lead_id = X AND status = 'running'` para verificar se existe cadencia ativa.

### 2. Novo componente: `CadenciaSheet.tsx`

Componente baseado no `FollowUpSheet.tsx` existente, com as seguintes diferencas:
- Pre-carrega a sequencia padrao de 7 etapas com as mensagens definidas
- Suporta variaveis `{nome}`, `{corretor_nome}`, `{empreendimento}`
- Delays configurados: imediato, 1h, 3h, 24h, 2 dias, 5 dias, 10 dias
- Todas as etapas apos a primeira tem `sendIfReplied: false` por padrao
- Ao salvar, cria a campanha com `lead_id` preenchido
- Valida que nao existe outra cadencia ativa para o mesmo lead

### 3. Hook: `use-cadencia-ativa.ts`

Hook que consulta se existe cadencia ativa para um lead:
- Query: `whatsapp_campaigns` onde `lead_id = X` e `status = 'running'`
- Retorna `{ isActive, campaignId, nextMessageAt, cancel }`
- `nextMessageAt` vem da proxima mensagem `scheduled` na `whatsapp_message_queue`
- `cancel()` atualiza status da campanha para `cancelled` e cancela mensagens pendentes na fila
- Utiliza Realtime para atualizar automaticamente

### 4. Pagina do Lead (`LeadPage.tsx`)

- Adicionar botao "Ativar Cadencia 10D" ao lado do botao "Follow-Up", visivel quando nao ha cadencia ativa
- Quando cadencia ativa:
  - Exibir indicador: bolinha verde piscando + texto "Cadencia ativa - proxima mensagem em Xh"
  - Botao STOP (icone quadrado) para cancelar
  - Ocultar botao de ativar cadencia

### 5. Kanban Card (`KanbanCard.tsx`)

- Na area de badges contextuais (onde ja aparecem "Roleta", "Fallback", "1a msg"):
  - Adicionar bolinha verde piscando com tooltip "Cadencia 10D ativa"
  - Adicionar botao STOP (icone quadrado) ao lado para cancelar

### 6. Cancelamento automatico por status

- No hook `use-kanban-leads.ts`, nas funcoes `confirmarVenda` e `inactivateLead`:
  - Verificar se existe cadencia ativa para o lead
  - Se sim, cancelar automaticamente (mesmo fluxo do botao STOP)

## Sequencia padrao pre-carregada

| Etapa | Delay | Mensagem |
|-------|-------|----------|
| 1 | Imediato | Ola {nome}, tudo bem? Aqui e {corretor_nome}, da Enove Imobiliaria! ... |
| 2 | 1 hora | Pode falar agora? |
| 3 | 3 horas | Tentei ligar para voce, mas nao consegui contato... |
| 4 | 24 horas | Oi {nome}! Caso nao esteja no momento certo... |
| 5 | 2 dias | Percebi que voce nao esta podendo falar comigo agora... |
| 6 | 5 dias | Ei! Nao esqueci de ti! Lembrei de te chamar... |
| 7 | 10 dias | Oi {nome}! Voltei porque surgiu uma condicao... |

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Migration | Adicionar coluna `lead_id` em `whatsapp_campaigns` |
| Criar | `src/components/crm/CadenciaSheet.tsx` |
| Criar | `src/hooks/use-cadencia-ativa.ts` |
| Editar | `src/pages/LeadPage.tsx` (botao + indicadores) |
| Editar | `src/components/crm/KanbanCard.tsx` (badge + stop) |
| Editar | `src/hooks/use-kanban-leads.ts` (cancelamento auto por status) |
| Editar | `src/components/crm/KanbanBoard.tsx` (passar prop de cadencia) |

## Detalhes tecnicos

- O webhook existente (`whatsapp-webhook`) ja cancela mensagens futuras quando detecta resposta do lead na tabela `whatsapp_lead_replies` -- nenhuma alteracao necessaria no backend
- O `whatsapp-message-sender` ja processa a fila e valida `send_if_replied` -- nenhuma alteracao necessaria
- A bolinha verde piscando usa CSS animation `animate-pulse` com `bg-emerald-400`
- O botao STOP usa o icone `Square` do lucide-react
- Consulta de cadencia ativa usa Realtime para atualizar instantaneamente quando o webhook cancela por resposta
