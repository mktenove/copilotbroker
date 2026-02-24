

## Plano de Continuidade: Inbox Inteligente + Copiloto IA

### Status Atual (o que ja esta pronto)

A Fase 1 foi concluida com sucesso:
- **Banco de dados**: Tabelas `conversations`, `conversation_messages` e `copilot_configs` criadas com RLS, triggers (auto-link lead por telefone, update preview/unread), indices e realtime habilitado
- **Edge Function `copilot-ai`**: Funcional com streaming, suporta `suggest_response`, `analyze_risk` e `suggest_next_step`
- **Webhook**: Arquiva mensagens inbound/outbound automaticamente nas conversas
- **UI basica**: `BrokerInbox` (lista + thread + painel contexto), `BrokerCopilotConfig`, rotas `/corretor/inbox` e `/corretor/copiloto` no sidebar
- **Hooks**: `useConversations`, `useConversationMessages`, `useCopilotConfig`, `useCopilotSuggestion`

### Gaps Identificados (o que falta implementar)

---

### 1. Envio Real de Mensagens via UAZAPI

**Problema**: O `sendMessage` no hook atual apenas insere na tabela `conversation_messages`, mas NAO envia a mensagem via WhatsApp (UAZAPI). O corretor digita, salva no banco, mas o lead nao recebe.

**Solucao**: Criar uma edge function `inbox-send-message` que:
- Recebe `conversation_id` + `content`
- Busca a instancia WhatsApp do corretor
- Envia via UAZAPI (`/send/text`)
- Salva na `conversation_messages` com `uazapi_message_id`
- Registra em `lead_interactions` para auditoria

---

### 2. Funcao `increment_copilot_count` Ausente

**Problema**: A edge function `copilot-ai` chama `supabase.rpc("increment_copilot_count")` mas essa funcao nao existe no banco. Resultado: erro silencioso a cada sugestao.

**Solucao**: Criar a funcao SQL via migracao.

---

### 3. Handoff IA ↔ Humano Incompleto

**Problema**: Ao clicar "Assumir Atendimento", apenas muda `ai_mode` na tabela. Nao cancela mensagens automaticas pendentes nem registra log de handoff.

**Solucao**: Ao mudar `ai_mode` para `copilot`:
- Cancelar mensagens pendentes na fila (`whatsapp_message_queue`) para os leads dessa conversa
- Registrar interacao de handoff em `lead_interactions`

---

### 4. Inbox Admin (Visao de Gestao)

**Problema**: Nao existe rota `/admin/inbox` para que admins/lideres visualizem todas as conversas, filtrem por corretor e auditem.

**Solucao**: 
- Adicionar RLS policy SELECT para admins na tabela `conversations`
- Criar pagina `AdminInbox` com filtros por corretor, empreendimento e status
- Adicionar rota e link no sidebar admin

---

### 5. Filtros Avancados e Priorizacao na Lista

**Problema**: A lista atual so filtra por status e busca textual. Faltam os filtros avancados e modos de ordenacao descritos nos requisitos (temperatura, oportunidade, risco, tempo parado).

**Solucao**: Adicionar filtros de temperatura, etapa kanban, cadencia ativa e ordenacao inteligente.

---

### 6. Indicadores Estrategicos no Topo da Inbox

**Problema**: Nao existem os cards de metricas no topo (conversas ativas, nao lidas, em risco, tempo medio sem interacao).

**Solucao**: Adicionar barra de KPIs estrategicos acima da lista.

---

### 7. Acoes Rapidas na Lista (sem abrir conversa)

**Problema**: Nao ha acoes rapidas direto na lista (marcar como lida, avancar etapa, ativar cadencia).

**Solucao**: Adicionar menu contextual (long-press no mobile / hover no desktop) com acoes rapidas.

---

### Plano de Implementacao (em ordem de prioridade)

**Batch 1 - Funcionalidade Core (critico)**
1. Migracao SQL: criar `increment_copilot_count`, adicionar RLS admin SELECT nas conversas
2. Edge function `inbox-send-message` para envio real via UAZAPI
3. Logica de handoff completa (cancelar fila + log)

**Batch 2 - UI Avancada**
4. Indicadores estrategicos (KPIs) no topo da Inbox
5. Filtros avancados + modos de ordenacao
6. Acoes rapidas na lista de conversas
7. Pagina Admin Inbox + rota + sidebar

**Batch 3 - Inteligencia**
8. Preview de sugestoes da IA direto na lista (sem abrir conversa)
9. Deteccao proativa de risco + badges visuais na lista

---

### Detalhes Tecnicos

**Edge Function `inbox-send-message`**:
```text
POST /inbox-send-message
Body: { conversation_id, content }
Auth: Bearer token do corretor
Fluxo:
  1. Busca conversa → phone
  2. Busca broker_whatsapp_instances → instance_name, instance_token
  3. POST UAZAPI /send/text
  4. INSERT conversation_messages (direction=outbound, sent_by=human)
  5. INSERT lead_interactions (tipo=whatsapp_enviada)
  6. UPDATE conversation (last_message_at, preview, status=attending)
```

**Migracao SQL**:
```text
- CREATE FUNCTION increment_copilot_count(_conversation_id uuid)
- ADD RLS policy: Admins podem ver todas as conversas (SELECT)
- ADD RLS policy: Admins podem ver todas as mensagens (SELECT)
```

**Handoff logic** (no hook `updateAiMode`):
```text
Quando mode = 'copilot':
  → Buscar lead_id da conversa
  → Cancelar whatsapp_message_queue pendentes desse lead
  → Inserir lead_interactions tipo 'handoff_manual'
```

---

Vou comecar pelo **Batch 1** (funcionalidade core), pois sem o envio real de mensagens via UAZAPI a Inbox nao funciona como chat ao vivo.

