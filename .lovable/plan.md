
# Plano Completo: Funcionalidades Essenciais do WhatsApp Dispatcher

## Resumo Executivo

Este plano implementa todas as funcionalidades sugeridas para tornar o sistema de disparo de WhatsApp pronto para produção, incluindo templates padrão, deduplicação, visualização de opt-outs, estatísticas diárias, gerenciador visual de templates e painel administrativo global.

---

## Funcionalidades a Implementar

### 1. Templates de Mensagem Padrão (Seed no Banco)
- Inserir 5 templates padrão na tabela `whatsapp_message_templates` com `broker_id = NULL` (globais)
- Templates disponíveis para todos os corretores automaticamente

### 2. Deduplicação de Envios
- Verificar no `whatsapp-message-sender` se já foi enviada mensagem para o lead nas últimas 24h
- Cancelar automaticamente mensagens duplicadas

### 3. Aba de Segurança Completa
- Lista de opt-outs com opção de remover
- Gráfico de estatísticas dos últimos 7 dias
- Histórico de erros de envio

### 4. Gerenciador Visual de Templates
- CRUD completo de templates personalizados
- Prévia de variáveis em tempo real
- Categorização por tipo (geral, follow-up, docs)

### 5. Painel Administrativo Global (/admin/whatsapp)
- Visão de todas as instâncias de corretores
- Estatísticas consolidadas
- Controle centralizado (pausar, desconectar)

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AdminWhatsApp.tsx` | Painel admin global de WhatsApp |
| `src/components/whatsapp/TemplatesSheet.tsx` | Modal para gerenciar templates |
| `src/components/whatsapp/OptoutsList.tsx` | Lista de telefones que pediram opt-out |
| `src/components/whatsapp/DailyStatsChart.tsx` | Gráfico de estatísticas diárias |
| `src/components/whatsapp/ErrorLogsCard.tsx` | Card com histórico de erros |
| `src/components/admin/AdminWhatsAppTab.tsx` | Tab de WhatsApp no admin |
| `src/hooks/use-whatsapp-stats.ts` | Hook para buscar estatísticas |
| `src/hooks/use-whatsapp-optouts.ts` | Hook para gerenciar opt-outs |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/admin/whatsapp` |
| `src/components/admin/AdminSidebar.tsx` | Adicionar item WhatsApp no menu |
| `src/components/whatsapp/SecurityTab.tsx` | Adicionar opt-outs, gráfico e erros |
| `src/components/whatsapp/CampaignsTab.tsx` | Botão para abrir gerenciador de templates |
| `src/pages/Admin.tsx` | Adicionar tab "WhatsApp" |
| `supabase/functions/whatsapp-message-sender/index.ts` | Adicionar verificação de deduplicação |

---

## Detalhamento Técnico

### 1. Templates Padrão (SQL Insert)

```sql
INSERT INTO whatsapp_message_templates (broker_id, name, content, category, is_active)
VALUES
  (NULL, 'Primeiro Contato', 'Olá {nome}! Sou {corretor_nome}, da Enove Incorporadora. Vi que você tem interesse no {empreendimento}. Posso te enviar mais informações?', 'geral', true),
  (NULL, 'Follow-up 1', 'Oi {nome}! Passando para saber se teve tempo de ver as informações do {empreendimento}. Posso ajudar com alguma dúvida?', 'follow_up', true),
  (NULL, 'Follow-up 2', 'Olá {nome}! Ainda está interessado(a) no {empreendimento}? Temos condições especiais este mês. Posso te explicar?', 'follow_up', true),
  (NULL, 'Solicitar Documentos', 'Olá {nome}! Para avançarmos no processo do {empreendimento}, preciso de alguns documentos. Posso te explicar quais são?', 'docs', true),
  (NULL, 'Agradecimento', 'Olá {nome}! Muito obrigado pelo interesse no {empreendimento}. Qualquer dúvida, estou à disposição. Abraços, {corretor_nome}', 'geral', true);
```

### 2. Deduplicação no whatsapp-message-sender

Adicionar verificação antes de enviar:

```typescript
// Verificar se já enviou para este lead nas últimas 24h
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { data: recentMessage } = await supabase
  .from("whatsapp_message_queue")
  .select("id")
  .eq("lead_id", queueMsg.lead_id)
  .eq("status", "sent")
  .gte("sent_at", oneDayAgo)
  .maybeSingle();

if (recentMessage) {
  // Cancelar - já foi enviado hoje
  await supabase
    .from("whatsapp_message_queue")
    .update({ 
      status: "cancelled", 
      error_message: "Deduplicação: já enviado nas últimas 24h" 
    })
    .eq("id", queueMsg.id);
  continue;
}
```

### 3. SecurityTab Completa

Nova estrutura da aba:

```text
┌─────────────────────────────────────────────────────────────┐
│  SEGURANÇA                                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Botão de Emergência  [⛔ PARAR TODOS OS ENVIOS]    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🔥 Aquecimento - Dia 5 de 14                       │    │
│  │  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░ 36%                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📊 Estatísticas dos Últimos 7 Dias                 │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  45 │ ▓▓▓▓▓▓▓                              │    │    │
│  │  │  30 │ ▓▓▓▓▓                                │    │    │
│  │  │  15 │ ▓▓▓                                  │    │    │
│  │  │   0 ├──────────────────────────────────────│    │    │
│  │  │     Seg  Ter  Qua  Qui  Sex  Sáb  Dom      │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  ● Enviados  ● Respostas  ● Falhas                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🚫 Opt-outs (15 telefones)              [Gerenciar]│    │
│  │  +55 51 99999-0001 │ "pare" │ há 2h         [🗑️]   │    │
│  │  +55 51 99999-0002 │ "parar" │ há 1d        [🗑️]   │    │
│  │  +55 51 99999-0003 │ "cancelar" │ há 3d     [🗑️]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚠️ Últimos Erros de Envio                          │    │
│  │  João Silva │ "number not registered" │ há 30min   │    │
│  │  Maria Santos │ "timeout" │ há 1h                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚙️ Limites de Envio                                │    │
│  │  Limite por hora: [───●─────] 30                   │    │
│  │  Limite por dia:  [─────●───] 150                  │    │
│  │  [Salvar Configurações]                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 4. TemplatesSheet (Gerenciador Visual)

```text
┌─────────────────────────────────────────────────────────────┐
│  Gerenciar Templates                               [X]     │
├─────────────────────────────────────────────────────────────┤
│  [+ Novo Template]                    [Categoria ▼] [🔍]   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 Primeiro Contato                         [Editar]│   │
│  │  Categoria: Geral  •  Variáveis: nome, empreend...  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  "Olá {nome}! Sou {corretor_nome}, da Enove..."     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 Follow-up 1                              [Editar]│   │
│  │  Categoria: Follow-up  •  Variáveis: nome, empree.. │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  "Oi {nome}! Passando para saber se teve tempo..."  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Criar/Editar Template ──                               │
│  Nome: [___________________________]                       │
│  Categoria: [Geral ▼]                                      │
│  Mensagem:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Olá {nome}! ...                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  Variáveis: {nome} {empreendimento} {corretor_nome}        │
│                                                             │
│  Prévia:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "Olá João! ..."                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancelar]                              [Salvar Template] │
└─────────────────────────────────────────────────────────────┘
```

### 5. AdminWhatsApp (Painel Global)

```text
┌─────────────────────────────────────────────────────────────────┐
│  📱 WhatsApp Dispatcher - Visão Geral                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │    8     │ │    6     │ │   142    │ │   12%    │           │
│  │ Instânc. │ │ Online   │ │ Enviados │ │ Resp.    │           │
│  │  ativas  │ │ agora    │ │   hoje   │ │   hoje   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  Instâncias dos Corretores                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Corretor      │ Telefone      │ Status  │ Enviados │ Ações ││
│  ├───────────────┼───────────────┼─────────┼──────────┼───────┤│
│  │ João Silva    │ +55 51 9999.. │ 🟢 Online│   45/150 │ [⏸️] ││
│  │ Maria Santos  │ +55 51 9888.. │ 🟢 Online│   30/100 │ [⏸️] ││
│  │ Pedro Costa   │ -             │ 🔴 Desonec│    0/60 │ [🔗] ││
│  │ Ana Oliveira  │ +55 51 9777.. │ 🟡 Pausado│   60/60 │ [▶️] ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  📊 Estatísticas Globais (últimos 7 dias)                       │
│  [Gráfico de barras com envios por dia]                         │
├─────────────────────────────────────────────────────────────────┤
│  🚫 Opt-outs Recentes                                           │
│  +55 51 99999-0001 │ "pare" │ há 2h                            │
│  +55 51 99999-0002 │ "stop" │ há 5h                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hooks Necessários

### use-whatsapp-stats.ts

```typescript
interface UseWhatsAppStatsReturn {
  dailyStats: WhatsAppDailyStats[];
  weeklyTotals: {
    sent: number;
    failed: number;
    replies: number;
    optouts: number;
  };
  isLoading: boolean;
  refetch: () => void;
}
```

### use-whatsapp-optouts.ts

```typescript
interface UseWhatsAppOptoutsReturn {
  optouts: WhatsAppOptout[];
  isLoading: boolean;
  removeOptout: (id: string) => Promise<void>;
  refetch: () => void;
}
```

---

## Ordem de Implementação

### Fase 1: Base de Dados e Backend
1. Inserir templates padrão no banco (SQL)
2. Adicionar deduplicação no `whatsapp-message-sender`

### Fase 2: Hooks e Componentes Auxiliares
3. Criar `use-whatsapp-stats.ts`
4. Criar `use-whatsapp-optouts.ts`
5. Criar `OptoutsList.tsx`
6. Criar `DailyStatsChart.tsx` (usando Recharts)
7. Criar `ErrorLogsCard.tsx`

### Fase 3: SecurityTab Completa
8. Refatorar `SecurityTab.tsx` com novos componentes
9. Integrar gráfico, opt-outs e erros

### Fase 4: Gerenciador de Templates
10. Criar `TemplatesSheet.tsx`
11. Integrar botão no `CampaignsTab.tsx`

### Fase 5: Painel Admin Global
12. Criar `AdminWhatsApp.tsx`
13. Adicionar rota em `App.tsx`
14. Adicionar item no `AdminSidebar.tsx`
15. Adicionar tab em `Admin.tsx`

---

## Tecnologias Utilizadas

- **Recharts**: Para gráficos de estatísticas (já instalado no projeto)
- **date-fns**: Para formatação de datas (já instalado)
- **Radix UI Sheet**: Para modais de templates e opt-outs (já disponível)
- **Tailwind CSS**: Para estilização consistente com o design system

---

## Resultado Esperado

Após a implementação completa:

1. **Corretores** terão:
   - 5 templates prontos para uso imediato
   - Capacidade de criar/editar templates personalizados
   - Visualização de estatísticas de envio
   - Lista de opt-outs e erros
   - Proteção contra envios duplicados

2. **Administradores** terão:
   - Visão global de todas as instâncias WhatsApp
   - Estatísticas consolidadas de todos os corretores
   - Controle centralizado (pausar, reativar instâncias)
   - Acesso à lista global de opt-outs

3. **Sistema** garantirá:
   - Não enviar para o mesmo lead 2x no mesmo dia
   - Respeitar opt-outs automaticamente
   - Manter histórico de erros para análise
