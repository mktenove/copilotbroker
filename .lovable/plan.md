
# Fase 2: Sistema de Campanhas + Integração Kanban

## Resumo

Implementar a funcionalidade completa de campanhas de disparo WhatsApp, permitindo que corretores selecionem leads por status do Kanban, criem templates de mensagem com variáveis dinâmicas, e disparem mensagens automatizadas com intervalo randômico de 60-240 segundos.

---

## O que será implementado

1. **Modal de Nova Campanha** - Interface para criar campanhas selecionando leads por status do Kanban
2. **Templates de Mensagem** - CRUD de templates com variáveis `{nome}`, `{empreendimento}`, `{corretor_nome}`
3. **Botão no Kanban** - Ação rápida "Disparar WhatsApp" em cada coluna
4. **Fila de Envio Funcional** - Listagem real das mensagens agendadas/enviadas
5. **Hook de Campanhas** - Gerenciamento de estado e operações CRUD
6. **Edge Function de Envio** - Processador de fila com intervalo randômico

---

## Arquivos a criar

| Arquivo | Função |
|---------|--------|
| `src/components/whatsapp/NewCampaignSheet.tsx` | Modal/Sheet para criar nova campanha |
| `src/components/whatsapp/TemplateSelector.tsx` | Seletor de templates com prévia |
| `src/components/whatsapp/LeadStatusSelector.tsx` | Seletor de status do Kanban |
| `src/components/whatsapp/MessagePreview.tsx` | Prévia da mensagem com variáveis substituídas |
| `src/components/whatsapp/CampaignCard.tsx` | Card individual de campanha na listagem |
| `src/components/whatsapp/TemplatesSheet.tsx` | Modal para gerenciar templates |
| `src/hooks/use-whatsapp-campaigns.ts` | Hook para campanhas |
| `src/hooks/use-whatsapp-queue.ts` | Hook para fila de envio |
| `supabase/functions/whatsapp-message-sender/index.ts` | Edge function processadora da fila |

---

## Arquivos a modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/whatsapp/CampaignsTab.tsx` | Adicionar funcionalidade real de campanhas |
| `src/components/whatsapp/QueueTab.tsx` | Listagem real da fila com dados do banco |
| `src/components/crm/KanbanColumn.tsx` | Adicionar botão "Disparar WhatsApp" |
| `src/components/whatsapp/index.ts` | Exportar novos componentes |

---

## Detalhamento Técnico

### 1. NewCampaignSheet.tsx

```text
Interface:
┌─────────────────────────────────────────┐
│  Nova Campanha                    [X]   │
├─────────────────────────────────────────┤
│  Nome da campanha: [____________]       │
│                                         │
│  Selecionar leads:                      │
│  [x] Novos Leads (15)                   │
│  [ ] Informações Enviadas (8)           │
│  [ ] Aguardando Dados (12)              │
│                                         │
│  Filtrar por projeto: [Todos    ▼]      │
│                                         │
│  Total de leads selecionados: 15        │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Mensagem:                              │
│  [Template ▼] ou [Escrever própria]     │
│                                         │
│  Prévia:                                │
│  ┌───────────────────────────────────┐  │
│  │ Olá João! Temos novidades sobre   │  │
│  │ o GoldenView que podem te...      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Cancelar]        [Iniciar Campanha]   │
└─────────────────────────────────────────┘
```

### 2. use-whatsapp-campaigns.ts

```typescript
interface UseWhatsAppCampaignsReturn {
  campaigns: WhatsAppCampaign[];
  isLoading: boolean;
  createCampaign: (data: CreateCampaignData) => Promise<void>;
  pauseCampaign: (id: string) => Promise<void>;
  resumeCampaign: (id: string) => Promise<void>;
  cancelCampaign: (id: string) => Promise<void>;
  templates: WhatsAppMessageTemplate[];
  createTemplate: (data: CreateTemplateData) => Promise<void>;
  updateTemplate: (id: string, data: Partial<CreateTemplateData>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}
```

### 3. use-whatsapp-queue.ts

```typescript
interface UseWhatsAppQueueReturn {
  queue: WhatsAppMessageQueue[];
  stats: {
    queued: number;
    sent: number;
    failed: number;
    replies: number;
  };
  isLoading: boolean;
  cancelMessage: (id: string) => Promise<void>;
  retryMessage: (id: string) => Promise<void>;
  nextSendIn: number | null; // segundos até próximo envio
}
```

### 4. whatsapp-message-sender (Edge Function)

Lógica do processador de fila:

```text
1. Buscar mensagens com status 'queued' ou 'scheduled'
2. Para cada corretor com mensagens pendentes:
   a. Verificar se instância está conectada
   b. Verificar limites (hora/dia)
   c. Verificar se não está pausado
   d. Verificar horário de trabalho
   e. Verificar opt-out do telefone
3. Enviar UMA mensagem por corretor por execução
4. Calcular próximo intervalo: random(60-240s) + jitter(0-5s)
5. Agendar próxima mensagem com scheduled_at = now + intervalo
6. Atualizar contadores (hourly_sent_count, daily_sent_count)
7. Registrar em lead_interactions
```

### 5. Integração com KanbanColumn

Adicionar ícone de WhatsApp no menu da coluna:

```tsx
<DropdownMenuItem 
  className="text-green-400 focus:bg-green-500/10"
  onClick={() => onDispatchWhatsApp?.(status)}
>
  <MessageSquare className="w-4 h-4 mr-2" />
  Disparar WhatsApp
</DropdownMenuItem>
```

---

## Fluxo de Criação de Campanha

```text
1. Corretor clica "Nova Campanha" ou "Disparar WhatsApp" no Kanban
2. Abre sheet com seletor de status/leads
3. Corretor escolhe template ou escreve mensagem
4. Sistema mostra prévia com variáveis substituídas
5. Corretor confirma
6. Sistema:
   a. Cria registro na tabela whatsapp_campaigns
   b. Para cada lead selecionado:
      - Valida telefone (E.164)
      - Verifica opt-out
      - Substitui variáveis na mensagem
      - Insere na whatsapp_message_queue com scheduled_at escalonado
   c. Atualiza total_leads na campanha
7. UI mostra progresso na aba Campanhas e Fila
```

---

## Cálculo de Intervalo Randômico

```javascript
// Para N leads, calcular tempo estimado
const calculateEstimatedTime = (leadCount: number): string => {
  const avgInterval = 150; // média entre 60 e 240
  const totalSeconds = leadCount * avgInterval;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `~${hours}h ${minutes}min` : `~${minutes}min`;
};

// Ao agendar cada mensagem
const scheduleMessages = async (leads, campaignId, message) => {
  let currentTime = new Date();
  
  for (const lead of leads) {
    // Intervalo randômico 60-240s + jitter 0-5s
    const interval = Math.floor(Math.random() * 180) + 60 + Math.floor(Math.random() * 5);
    currentTime = new Date(currentTime.getTime() + interval * 1000);
    
    await insertQueueItem({
      lead_id: lead.id,
      phone: formatPhoneE164(lead.whatsapp),
      message: replaceVariables(message, lead),
      campaign_id: campaignId,
      scheduled_at: currentTime.toISOString(),
      status: 'scheduled'
    });
  }
};
```

---

## Templates Padrão (Seed)

```typescript
const DEFAULT_TEMPLATES = [
  {
    name: "Primeiro contato",
    content: "Olá {nome}! Sou {corretor_nome}, da Enove Incorporadora. Vi que você tem interesse no {empreendimento}. Posso te enviar mais informações?",
    category: "geral"
  },
  {
    name: "Follow-up 1",
    content: "Oi {nome}! Passando para saber se teve tempo de ver as informações do {empreendimento}. Posso ajudar com alguma dúvida?",
    category: "follow_up"
  },
  {
    name: "Solicitar documentos",
    content: "Olá {nome}! Para avançarmos no processo do {empreendimento}, preciso de alguns documentos. Posso te explicar quais são?",
    category: "docs"
  }
];
```

---

## Validações de Segurança

Antes de criar campanha:
1. Verificar se corretor tem instância conectada
2. Verificar se não está pausado
3. Verificar se há saldo diário disponível
4. Filtrar telefones em opt-out
5. Filtrar telefones já contatados hoje

---

## UI da Fila de Envio (QueueTab atualizado)

```text
┌─────────────────────────────────────────────────────────┐
│  📬 Fila de Envio                   Próximo em: 2:34   │
├─────────────────────────────────────────────────────────┤
│  [🔍 Buscar...]  [Status ▼]  [Campanha ▼]              │
├─────────────────────────────────────────────────────────┤
│  Nome          │ Status    │ Horário │ Campanha        │
│  ─────────────────────────────────────────────────────  │
│  João Silva    │ 🟡 Agend. │ 14:32   │ Follow-up Novos │
│  Maria Santos  │ 🟢 Env.   │ 14:28   │ Follow-up Novos │
│  Pedro Costa   │ 🔴 Falhou │ 14:25   │ Follow-up Novos │
│  Ana Oliveira  │ ⏳ Na fila│ ─       │ Follow-up Novos │
└─────────────────────────────────────────────────────────┘
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │  24  │ │  45  │ │   3  │ │   2  │                   │
│  │Fila  │ │Enviad│ │Falhas│ │Resp. │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
```

---

## Ordem de Implementação

1. Criar hooks `use-whatsapp-campaigns.ts` e `use-whatsapp-queue.ts`
2. Criar componentes auxiliares (TemplateSelector, LeadStatusSelector, MessagePreview)
3. Criar NewCampaignSheet.tsx
4. Atualizar CampaignsTab.tsx com listagem real
5. Atualizar QueueTab.tsx com dados reais
6. Criar edge function `whatsapp-message-sender`
7. Adicionar botão no KanbanColumn.tsx
8. Testar fluxo completo

---

## Resultado Esperado

Após esta fase, o corretor poderá:
- Criar campanhas selecionando leads por status do Kanban
- Usar templates prontos ou escrever mensagens personalizadas
- Ver prévia da mensagem antes de enviar
- Acompanhar o progresso na aba de Campanhas
- Visualizar a fila de envio em tempo real
- Disparar diretamente de uma coluna do Kanban
