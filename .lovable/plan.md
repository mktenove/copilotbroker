

## Plano de Continuidade: Inbox Inteligente + Copiloto IA

### Status Atual

**Fase 1 ✅** - Banco de dados, edge functions, UI básica, hooks  
**Batch 1 ✅** - increment_copilot_count, inbox-send-message (UAZAPI real), handoff completo  
**Batch 2 ✅** - KPIs estratégicos, filtros avançados, ordenação inteligente, ações rápidas, Admin Inbox  
**Batch 3 ✅** - Badges visuais de risco (animação pulse), tempo parado na lista, detecção proativa

### O que está pronto

- Tabelas: conversations, conversation_messages, copilot_configs (RLS completo)
- Edge Functions: copilot-ai, inbox-send-message, whatsapp-webhook (arquiva mensagens)
- Inbox Corretor: /corretor/inbox com KPIs, filtros, ordenação, ações rápidas, thread, copiloto
- Inbox Admin: /admin/inbox com filtro por corretor, visão de gestão
- Sidebar admin e mobile: botão Inbox adicionado
- Handoff IA↔Humano: cancela fila pendente + log em lead_interactions
- Badges visuais: Quente (🔥), Risco (⚠️ animado), IA ativa, Score %, Tempo parado (>24h)
