

## Plano de Continuidade: Inbox Inteligente + Copiloto IA

### Status Atual (o que ja esta pronto)

A Fase 1 foi concluida com sucesso:
- **Banco de dados**: Tabelas `conversations`, `conversation_messages` e `copilot_configs` criadas com RLS, triggers (auto-link lead por telefone, update preview/unread), indices e realtime habilitado
- **Edge Function `copilot-ai`**: Funcional com streaming, suporta `suggest_response`, `analyze_risk` e `suggest_next_step`
- **Webhook**: Arquiva mensagens inbound/outbound automaticamente nas conversas
- **UI basica**: `BrokerInbox` (lista + thread + painel contexto), `BrokerCopilotConfig`, rotas `/corretor/inbox` e `/corretor/copiloto` no sidebar
- **Hooks**: `useConversations`, `useConversationMessages`, `useCopilotConfig`, `useCopilotSuggestion`

### Batch 1 - Concluido ✅

1. ✅ **Migracao SQL**: `increment_copilot_count` criada + RLS admin/lider para conversations e messages
2. ✅ **Edge function `inbox-send-message`**: Envio real via UAZAPI com fallback de endpoints e auth headers
3. ✅ **Handoff completo**: Ao assumir atendimento, cancela fila pendente + registra log de handoff em lead_interactions

### Proximos Passos (Batch 2 - UI Avancada)

4. Indicadores estrategicos (KPIs) no topo da Inbox
5. Filtros avancados + modos de ordenacao
6. Acoes rapidas na lista de conversas
7. Pagina Admin Inbox + rota + sidebar

### Batch 3 - Inteligencia

8. Preview de sugestoes da IA direto na lista (sem abrir conversa)
9. Deteccao proativa de risco + badges visuais na lista
