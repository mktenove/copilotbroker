
# Plano: Primeira Mensagem Automática para Leads de Landing Page

## Visão Geral

Implementar automação "opt-in" por corretor para enviar automaticamente a primeira mensagem de WhatsApp quando um lead se cadastrar via landing page de empreendimento. O sistema identifica a origem do lead e respeita regras anti-block.

---

## Regras de Negócio

### Quando ENVIAR mensagem automática:
- Lead cadastrado via landing page pública (forms GVFormSection, MCFormSection, FormSection)
- Corretor tem automação ativa para o empreendimento específico OU para todos empreendimentos
- WhatsApp do corretor está conectado
- Está dentro do horário comercial configurado (senão, enfileira para próximo horário)
- Lead nunca recebeu mensagem automática anteriormente

### Quando NÃO ENVIAR:
- Lead adicionado manualmente (`landing_page = 'admin_manual'` na tabela `lead_attribution`)
- Lead importado via planilha (futuro: `landing_page = 'import'`)
- Automação desativada pelo corretor
- Corretor sem instância WhatsApp conectada

---

## Arquitetura

```text
┌─────────────────┐    ┌──────────────────────┐    ┌───────────────────────┐
│  Landing Page   │───►│  Supabase Trigger    │───►│  Edge Function        │
│  Form Submit    │    │  after_insert leads  │    │  auto-first-message   │
└─────────────────┘    └──────────────────────┘    └───────────────────────┘
                                                              │
                       ┌──────────────────────┐               ▼
                       │  whatsapp_message    │◄──────────────┘
                       │  _queue              │    (respeitando delay)
                       └──────────────────────┘
```

---

## Alterações no Banco de Dados

### 1. Nova Tabela: `broker_auto_message_rules`

```sql
CREATE TABLE public.broker_auto_message_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL = todos
  is_active BOOLEAN DEFAULT true,
  message_content TEXT NOT NULL,
  delay_minutes INTEGER DEFAULT 2 CHECK (delay_minutes >= 1 AND delay_minutes <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(broker_id, project_id) -- 1 regra por corretor/empreendimento
);
```

### 2. Nova Coluna na Tabela `leads`

```sql
ALTER TABLE public.leads 
ADD COLUMN auto_first_message_sent BOOLEAN DEFAULT false;

ALTER TABLE public.leads 
ADD COLUMN auto_first_message_at TIMESTAMPTZ;
```

### 3. Novo Trigger/Function para Auto-Disparo

Trigger que chama Edge Function após insert de lead.

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/auto-first-message/index.ts` | Edge Function para processar envio automático |
| `src/components/whatsapp/AutoMessageTab.tsx` | Nova aba para configurar automação |
| `src/components/whatsapp/AutoMessageRuleEditor.tsx` | Editor de regra com preview |
| `src/hooks/use-auto-message-rules.ts` | Hook para gerenciar regras |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/BrokerWhatsApp.tsx` | Adicionar nova aba "Automação" |
| `src/components/crm/KanbanCard.tsx` | Adicionar badge de status da primeira mensagem |
| `src/types/whatsapp.ts` | Adicionar tipos para auto-message |
| `src/components/FormSection.tsx` | Marcar leads como vindos de landing page |
| `src/components/goldenview/GVFormSection.tsx` | Idem |
| `src/components/mauriciocardoso/MCFormSection.tsx` | Idem |
| `src/components/admin/AddLeadModal.tsx` | Garantir que não dispara automação |

---

## Detalhamento Técnico

### 1. Edge Function: auto-first-message

```typescript
// Lógica principal:
1. Receber leadId via trigger ou invocação
2. Buscar lead e verificar se tem broker_id
3. Verificar se lead veio de landing page (attribution.landing_page != 'admin_manual')
4. Buscar regra ativa para broker + projeto (ou broker + NULL)
5. Verificar se instância WhatsApp está conectada
6. Calcular horário de envio (agora + delay OU próximo horário comercial)
7. Inserir na whatsapp_message_queue
8. Marcar lead.auto_first_message_sent = true
```

### 2. Diferenciação de Origem do Lead

Modificar forms de landing pages para sempre registrar origem:

```typescript
// Após insert do lead
await supabase.from("lead_attribution").insert({
  lead_id: leadId,
  project_id: projectId,
  landing_page: "landing_page", // <-- Chave para identificar
});
```

No AddLeadModal já usa `landing_page: 'admin_manual'`, então:
- `landing_page = 'landing_page'` → Dispara automação
- `landing_page = 'admin_manual'` → NÃO dispara
- `landing_page = 'import'` → NÃO dispara (futuro)

### 3. Interface de Configuração (AutoMessageTab)

```text
┌───────────────────────────────────────────────────────────────────┐
│  🤖 AUTOMAÇÃO DE PRIMEIRA MENSAGEM                                │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ℹ️ Esta mensagem é enviada automaticamente quando um lead  │  │
│  │     se cadastra via landing page do empreendimento.         │  │
│  │                                                             │  │
│  │  ❌ Leads manuais ou importados NUNCA recebem automação.    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─── Regras Ativas ─────────────────────────────────────────┐   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  🏠 Golden View           [Ativo ●]    [Editar]    │   │   │
│  │  │  Delay: 3 min  •  Última: há 2h                    │   │   │
│  │  │  "Olá {nome_lead}! Vi seu interesse no Golden..."  │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  🌐 Todos os Empreendimentos  [Inativo ○] [Editar] │   │   │
│  │  │  Delay: 2 min                                      │   │   │
│  │  │  "Olá {nome_lead}! Sou {nome_corretor}, da Enove." │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  [+ Nova Regra de Automação]                               │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 4. Editor de Regra (Sheet)

```text
┌───────────────────────────────────────────────────────────────────┐
│  Configurar Automação                                      [X]   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Empreendimento:                                                  │
│  [Todos os empreendimentos ▼]                                     │
│                                                                   │
│  Delay para envio:                                                │
│  [●━━━━━━━━━━━━━━━━━━━━━━━━━●] 3 minutos                         │
│  (entre 1 e 5 minutos)                                            │
│                                                                   │
│  Mensagem:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Olá {nome_lead}! 👋                                         │  │
│  │                                                             │  │
│  │ Sou {nome_corretor}, da Enove Incorporadora.               │  │
│  │ Vi que você tem interesse no {empreendimento}!              │  │
│  │                                                             │  │
│  │ Posso te enviar mais informações?                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Variáveis: {nome_lead} {nome_corretor} {empreendimento}          │
│                                                                   │
│  Preview:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 💬 Olá João! 👋                                             │  │
│  │                                                             │  │
│  │ Sou Maria, da Enove Incorporadora.                          │  │
│  │ Vi que você tem interesse no Golden View!                   │  │
│  │                                                             │  │
│  │ Posso te enviar mais informações?                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ⚠️ Esta mensagem será enviada automaticamente após o cadastro   │
│     do lead na landing page.                                      │
│                                                                   │
│  [Cancelar]                              [Ativar] [Salvar Regra]  │
└───────────────────────────────────────────────────────────────────┘
```

### 5. Badge no KanbanCard

```text
Adicionar ao card do lead:

┌─────────────────────────────────────────┐
│  ...                                    │
│  ┌─────────────────────────────────┐    │
│  │ 🟢 Primeira msg enviada         │ ← se auto_first_message_sent = true
│  └─────────────────────────────────┘    │
│                       OU                │
│  ┌─────────────────────────────────┐    │
│  │ 🔒 Origem: Manual               │ ← se landing_page = 'admin_manual'
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Fluxo de Segurança Anti-Block

1. **Delay configurável (1-5 min)**: Evita envio instantâneo
2. **Fila única**: Usa `whatsapp_message_queue` existente
3. **Respeita limites hora/dia**: Já implementado no `whatsapp-message-sender`
4. **Horário comercial**: Se fora do horário, agenda para primeiro horário do próximo dia
5. **Intervalo randômico**: Já aplicado na fila
6. **Deduplicação**: Nunca envia 2x para mesmo lead (campo `auto_first_message_sent`)

---

## Políticas RLS

```sql
-- Corretores podem ver e gerenciar suas próprias regras
CREATE POLICY "Corretores gerenciam suas regras"
ON public.broker_auto_message_rules
FOR ALL
USING (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);
```

---

## Ordem de Implementação

### Fase 1: Banco de Dados
1. Criar tabela `broker_auto_message_rules`
2. Adicionar colunas `auto_first_message_sent` e `auto_first_message_at` na tabela `leads`
3. Configurar RLS

### Fase 2: Identificação de Origem
4. Atualizar `FormSection.tsx` para marcar `landing_page: 'landing_page'`
5. Atualizar `GVFormSection.tsx` e `MCFormSection.tsx`
6. Verificar que `AddLeadModal.tsx` usa `landing_page: 'admin_manual'`

### Fase 3: Edge Function
7. Criar `auto-first-message/index.ts`
8. Criar trigger de database para chamar função após insert

### Fase 4: Interface do Corretor
9. Criar hook `use-auto-message-rules.ts`
10. Criar `AutoMessageTab.tsx`
11. Criar `AutoMessageRuleEditor.tsx`
12. Adicionar aba em `BrokerWhatsApp.tsx`

### Fase 5: Visualização
13. Atualizar `KanbanCard.tsx` com badge
14. Adicionar log em `lead_interactions`

---

## Resultado Esperado

### Para o Corretor:
- Configurar automação em 1 clique por empreendimento
- Visualizar prévia da mensagem antes de ativar
- Controlar delay entre 1-5 minutos
- Ver status de envio no card do lead

### Para o Sistema:
- Identificar corretamente leads de landing page vs manuais
- Nunca enviar 2x para o mesmo lead
- Respeitar horário comercial e limites anti-block
- Logs completos de sucesso/erro

### Para o Lead:
- Receber confirmação de atendimento em até 5 minutos
- Mensagem personalizada com nome e empreendimento
