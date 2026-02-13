

## Implementar Sequencia de Mensagens nas Campanhas

### Resumo
Transformar as campanhas de mensagem unica em campanhas com multiplas etapas (steps), onde cada etapa pode ter um delay configuravel em relacao a etapa anterior. Isso permite criar fluxos como: mensagem imediata -> follow-up apos 24h -> lembrete apos 3 dias.

Nesta primeira versao, os steps serao apenas de texto (sem midia/imagem/video), mantendo a implementacao mais simples e funcional.

### Parte 1: Banco de Dados

**Nova tabela `campaign_steps`:**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| campaign_id | uuid FK | Referencia para whatsapp_campaigns |
| step_order | integer | Ordem da etapa (1, 2, 3...) |
| message_content | text | Texto da mensagem (suporta variaveis) |
| delay_minutes | integer (default 0) | Delay em minutos apos a etapa anterior |
| template_id | uuid nullable | Template opcional |
| created_at | timestamp | Data de criacao |

**Alteracao na tabela `whatsapp_message_queue`:**
- Adicionar coluna `step_number` (integer, nullable) para identificar qual etapa da sequencia

**RLS:** Mesmas regras das campanhas (broker ve seus dados, admin ve tudo).

### Parte 2: Interface - Builder de Steps

**Arquivo: `src/components/whatsapp/NewCampaignSheet.tsx`**

Substituir o campo de mensagem unica por um builder de sequencia:

```text
+---------------------------------------------+
| Nova Campanha                               |
|                                             |
| Nome: [Follow-up Novos Leads         ]      |
| Status: [x] Novos  [x] Info Enviada         |
| Empreendimento: [Todos              v]      |
| 42 leads selecionados | ~1h 45min           |
|                                             |
| --- Sequencia de Mensagens ---              |
|                                             |
| Etapa 1                                     |
| Enviar: Imediatamente                       |
| [Template v] ou [Escrever propria]          |
| [Oi {nome}! Vi que voce se...]              |
| Preview: "Oi Joao! Vi que voce se..."       |
|                                             |
|        apos 24 horas                        |
|                                             |
| Etapa 2                              [X]    |
| Enviar apos: [24] [horas v]                 |
| [Oi {nome}, tudo bem? Passando...]          |
| Preview: "Oi Joao, tudo bem?..."            |
|                                             |
|        apos 3 dias                          |
|                                             |
| Etapa 3                              [X]    |
| Enviar apos: [3] [dias v]                   |
| [{nome}, ultima oportunidade...]            |
|                                             |
| [+ Adicionar etapa]                         |
|                                             |
|  [Cancelar]  [Iniciar Campanha]   (sticky)  |
+---------------------------------------------+
```

Cada step pode usar template ou mensagem personalizada, com delay configuravel (minutos, horas ou dias). A etapa 1 e sempre imediata. O botao "+ Adicionar etapa" adiciona novos steps. Cada step apos o primeiro tem um botao de remover.

### Parte 3: Hook de Campanhas

**Arquivo: `src/hooks/use-whatsapp-campaigns.ts`**

Atualizar a interface `CreateCampaignData` para incluir array de steps:

```typescript
interface CampaignStep {
  messageContent: string;
  delayMinutes: number;
  templateId?: string;
}

interface CreateCampaignData {
  name: string;
  targetStatus: LeadStatus[];
  projectId?: string;
  steps: CampaignStep[]; // Array de etapas
}
```

Atualizar `createCampaign` para:
1. Criar a campanha
2. Inserir os steps na tabela `campaign_steps`
3. Para cada lead, agendar TODAS as etapas na fila:
   - Step 1: `scheduled_at = now + random_interval` (como hoje)
   - Step 2: `scheduled_at = step1_time + delay_step2 + random_jitter`
   - Step 3: `scheduled_at = step2_time + delay_step3 + random_jitter`
4. Cada item da fila guarda o `step_number`

O `total_leads` da campanha agora reflete leads x steps (ex: 42 leads x 3 steps = 126 mensagens totais).

### Parte 4: Deduplicacao Inteligente no Edge Function

**Arquivo: `supabase/functions/whatsapp-message-sender/index.ts`**

A deduplicacao atual cancela mensagens se ja foi enviada ao lead nas ultimas 24h. Isso conflita com sequencias que podem ter steps em menos de 24h. Ajustar para:

- Se a mensagem pertence a uma campanha com steps (`step_number` presente), NAO aplicar deduplicacao entre steps da mesma campanha
- Manter deduplicacao entre campanhas diferentes

### Parte 5: Cancelamento por Resposta (Bonus)

Na logica de processamento da fila, se o lead responder (detectado via webhook), cancelar automaticamente os steps futuros daquela campanha para aquele lead. Isso evita spam apos o lead ja ter interagido.

### Parte 6: Layout do Sheet (Fix do scroll)

Aproveitar para corrigir o problema de scroll mencionado anteriormente: os botoes "Cancelar" e "Iniciar Campanha" ficam sticky no rodape, sempre visiveis independente do tamanho da tela.

### Compatibilidade Retroativa

- Campanhas antigas (sem steps na tabela `campaign_steps`) continuam funcionando normalmente como mensagem unica
- O `NewCampaignSheet` inicia com 1 step por padrao, mantendo a experiencia simples para quem quer enviar apenas uma mensagem
- O `CampaignCard` mostra a contagem de steps quando houver mais de 1

### Arquivos modificados

1. **Migracao SQL** - nova tabela `campaign_steps`, nova coluna em `whatsapp_message_queue`
2. **`src/components/whatsapp/NewCampaignSheet.tsx`** - builder de steps + layout sticky
3. **`src/hooks/use-whatsapp-campaigns.ts`** - logica de criacao com multiplos steps
4. **`supabase/functions/whatsapp-message-sender/index.ts`** - ajuste deduplicacao
5. **`src/components/whatsapp/CampaignCard.tsx`** - mostrar quantidade de steps
6. **`src/types/whatsapp.ts`** - novos tipos para steps

