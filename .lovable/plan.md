

# Otimizacao de Performance do Sistema

## Diagnostico

Analisei os principais pontos de lentidao no sistema:

1. **Admin.tsx carrega TODOS os leads sem limite** — `fetchLeads()` faz `select(*)` sem `.limit()`, trazendo milhares de registros de uma vez
2. **KanbanBoard carrega todos os leads nao-inativos** — mesma situacao, sem paginacao
3. **IntelligenceDashboard faz 9 queries simultaneas** com `.limit(1000)` cada, processando tudo no frontend via `useMemo`
4. **AnalyticsDashboard faz `select(*)` em page_views** — tabela que cresce muito rapido
5. **Nenhum hook usa React Query** — dados sao buscados com `useState`/`useEffect` sem cache, deduplicacao ou stale-while-revalidate
6. **Dados duplicados entre abas** — Admin.tsx busca todos os leads para a tab "Leads", e o KanbanBoard busca novamente para a tab "CRM"

## Plano de Otimizacao (por prioridade)

### 1. Migrar fetching para React Query (maior impacto)

Substituir os `useState + useEffect + fetchX` por `useQuery` do TanStack React Query (ja instalado no projeto). Isso resolve:
- **Cache automatico**: trocar de aba CRM para Leads nao rebusca tudo
- **Stale-while-revalidate**: mostra dados em cache enquanto atualiza em background
- **Deduplicacao**: multiplos componentes pedindo os mesmos dados = 1 request

**Arquivos afetados:**
- `src/pages/Admin.tsx` — `fetchLeads`, `fetchBrokers`, `fetchProjects` viram `useQuery`
- `src/hooks/use-kanban-leads.ts` — `fetchLeads` vira `useQuery` com `queryKey` incluindo filtros
- `src/components/admin/AnalyticsDashboard.tsx` — `fetchData` vira `useQuery`
- `src/components/admin/intelligence/hooks/useIntelligenceData.ts` — `fetchAll` vira `useQuery`

### 2. Paginacao no Admin Leads Table

A tab "Leads" do Admin carrega todos os leads de uma vez. Adicionar paginacao server-side:

- Usar `.range(from, to)` do Supabase com paginas de 50 registros
- Adicionar controles de paginacao na UI (anterior/proximo/pagina)
- Manter filtros funcionando com a paginacao
- Contar total com `.count()` em query separada (head: true)

**Arquivos afetados:**
- `src/pages/Admin.tsx` — logica de paginacao + query com `.range()`
- `src/components/admin/LeadsTable.tsx` — controles de paginacao na UI

### 3. Selecionar apenas colunas necessarias

Varias queries fazem `select(*)` quando so precisam de 5-8 colunas:

- `Admin.tsx fetchLeads`: trocar `select(*)` por `select("id, name, whatsapp, email, created_at, source, status, lead_origin, last_interaction_at, registered_at, broker_id, project_id, broker:brokers!leads_broker_id_fkey(name, slug)")`
- `useIntelligenceData`: trocar `select(*)` em interactions/roletas_log por colunas especificas
- `AnalyticsDashboard`: trocar `select(*)` em page_views por colunas especificas

### 4. Lazy loading por aba

Atualmente o Admin.tsx busca leads mesmo quando o usuario esta na aba CRM. Condicionar o fetch pela aba ativa:

- Tab "leads": so busca quando `activeTab === "leads"`
- Tab "analytics": so busca dados de analytics quando visivel
- Tab "crm" (KanbanBoard): ja busca independente, manter assim

**Arquivo afetado:**
- `src/pages/Admin.tsx` — condicionar `enabled` do `useQuery` pela aba ativa

### 5. Indices no banco de dados (migracao SQL)

Criar indices para as queries mais frequentes:

```sql
-- Leads por broker (Kanban, filtros)
CREATE INDEX IF NOT EXISTS idx_leads_broker_id_status ON leads(broker_id, status);

-- Leads por data de criacao (Admin, Analytics, Intelligence)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Leads por projeto
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);

-- Interacoes por lead (Timeline, detalhes)
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id, created_at DESC);

-- Interacoes por data (Analytics, Intelligence)
CREATE INDEX IF NOT EXISTS idx_lead_interactions_created_at ON lead_interactions(created_at DESC);

-- Page views por data (Analytics)
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);

-- Fila WhatsApp por status (processamento)
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_message_queue(status, scheduled_at);
```

### 6. Debounce na busca do Kanban

O campo de busca no KanbanBoard filtra localmente mas dispara re-renders a cada tecla. Adicionar debounce de 300ms no `searchTerm` para filtrar leads.

## Resumo de impacto esperado

| Otimizacao | Reducao de latencia | Esforco |
|---|---|---|
| React Query (cache) | 50-70% nas trocas de aba | Medio |
| Paginacao Leads | 80%+ na tab Leads com muitos dados | Medio |
| Select colunas | 20-30% no payload | Baixo |
| Lazy loading abas | Elimina fetches desnecessarios | Baixo |
| Indices SQL | 40-60% nas queries | Baixo |
| Debounce busca | Menos re-renders | Baixo |

## Arquivos editados

- `src/pages/Admin.tsx`
- `src/hooks/use-kanban-leads.ts`
- `src/components/admin/AnalyticsDashboard.tsx`
- `src/components/admin/intelligence/hooks/useIntelligenceData.ts`
- `src/components/admin/LeadsTable.tsx`
- 1 migracao SQL (indices)

