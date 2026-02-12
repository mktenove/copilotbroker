

# Modulo Roleta de Leads -- Round-Robin com Timeout e Fallback

## Visao Geral

Implementar um sistema completo de distribuicao automatica de leads por roleta (round-robin continuo), com timeout configuravel, fallback para lider, e painel administrativo integrado ao CRM existente.

## Fase 1: Banco de Dados

### 1.1 Novo role "leader" no enum `app_role`

```sql
ALTER TYPE app_role ADD VALUE 'leader';
```

### 1.2 Adicionar `lider_id` na tabela `brokers`

Coluna nullable inicialmente (corretores existentes nao tem lider ainda). Referencia a propria tabela brokers.

```sql
ALTER TABLE brokers ADD COLUMN lider_id uuid REFERENCES brokers(id);
```

### 1.3 Novo enum `distribution_status`

```sql
CREATE TYPE distribution_status AS ENUM (
  'atribuicao_inicial',
  'reassinado_timeout',
  'fallback_lider',
  'atendimento_iniciado'
);
```

### 1.4 Novos campos na tabela `leads`

```sql
ALTER TABLE leads
  ADD COLUMN roleta_id uuid,
  ADD COLUMN corretor_atribuido_id uuid REFERENCES brokers(id),
  ADD COLUMN atribuido_em timestamptz,
  ADD COLUMN atendimento_iniciado_em timestamptz,
  ADD COLUMN reserva_expira_em timestamptz,
  ADD COLUMN status_distribuicao distribution_status,
  ADD COLUMN motivo_atribuicao text;
```

### 1.5 Tabela `roletas`

```sql
CREATE TABLE roletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  lider_id uuid NOT NULL REFERENCES brokers(id),
  tempo_reserva_minutos int NOT NULL DEFAULT 10,
  ativa boolean NOT NULL DEFAULT true,
  ultimo_membro_ordem_atribuida int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roletas ENABLE ROW LEVEL SECURITY;
```

Politicas RLS:
- Admin e Leader: CRUD total
- Broker: SELECT apenas nas roletas das quais e membro

### 1.6 Tabela `roletas_membros`

```sql
CREATE TABLE roletas_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id uuid NOT NULL REFERENCES roletas(id) ON DELETE CASCADE,
  corretor_id uuid NOT NULL REFERENCES brokers(id),
  ordem int NOT NULL,
  status_checkin boolean NOT NULL DEFAULT false,
  checkin_em timestamptz,
  checkout_em timestamptz,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(roleta_id, corretor_id)
);
ALTER TABLE roletas_membros ENABLE ROW LEVEL SECURITY;
```

### 1.7 Tabela `roletas_empreendimentos`

```sql
CREATE TABLE roletas_empreendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id uuid NOT NULL REFERENCES roletas(id) ON DELETE CASCADE,
  empreendimento_id uuid NOT NULL REFERENCES projects(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roletas_empreendimentos ENABLE ROW LEVEL SECURITY;
```

Restricao de unicidade condicional (um empreendimento so pode estar em uma roleta ativa):

```sql
CREATE UNIQUE INDEX idx_unique_empreendimento_roleta_ativa
  ON roletas_empreendimentos (empreendimento_id)
  WHERE ativo = true;
```

### 1.8 Tabela `roletas_log`

```sql
CREATE TABLE roletas_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id uuid NOT NULL REFERENCES roletas(id),
  lead_id uuid REFERENCES leads(id),
  acao text NOT NULL,
  de_corretor_id uuid REFERENCES brokers(id),
  para_corretor_id uuid REFERENCES brokers(id),
  motivo text,
  executado_por_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roletas_log ENABLE ROW LEVEL SECURITY;
```

### 1.9 Funcao security definer para verificar role leader

```sql
CREATE OR REPLACE FUNCTION public.has_role_or_leader(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'leader')
  )
$$;
```

### 1.10 Adicionar valores ao enum `interaction_type`

```sql
ALTER TYPE interaction_type ADD VALUE 'roleta_atribuicao';
ALTER TYPE interaction_type ADD VALUE 'roleta_timeout';
ALTER TYPE interaction_type ADD VALUE 'roleta_fallback';
ALTER TYPE interaction_type ADD VALUE 'roleta_transferencia';
ALTER TYPE interaction_type ADD VALUE 'atendimento_iniciado';
```

---

## Fase 2: Edge Function -- Distribuicao e Timeout

### 2.1 `supabase/functions/roleta-distribuir/index.ts`

Funcao chamada quando um novo lead chega sem `broker_id`:

1. Verifica se o `project_id` do lead esta vinculado a uma roleta ativa (via `roletas_empreendimentos`)
2. Se nao: retorna sem acao (fluxo atual)
3. Se sim: executa round-robin
   - Busca membros com `status_checkin = true` e `ativo = true`, ordenados por `ordem`
   - Se nenhum membro online: fallback para `roleta.lider_id`
   - Se ha membros: calcula proximo apos `ultimo_membro_ordem_atribuida` (circular)
   - Atualiza lead com `corretor_atribuido_id`, `atribuido_em`, `reserva_expira_em`, `status_distribuicao`
   - Atualiza `roletas.ultimo_membro_ordem_atribuida`
   - Insere log em `roletas_log`
   - Chama `notify-new-lead` para notificar o corretor

Usa `FOR UPDATE` no SELECT da roleta para lock transacional.

### 2.2 `supabase/functions/roleta-timeout/index.ts`

Chamada via pg_cron a cada 1 minuto:

1. Busca leads com `reserva_expira_em <= now()` e `atendimento_iniciado_em IS NULL` e `status_distribuicao IN ('atribuicao_inicial', 'reassinado_timeout')`
2. Para cada lead: redistribui via round-robin (pula corretor atual)
3. Se ninguem disponivel: fallback lider
4. Loga e notifica

### 2.3 Trigger no banco para auto-distribuir

Trigger `AFTER INSERT` na tabela `leads`:
- Se `broker_id IS NULL` e `project_id IS NOT NULL`: chama a edge function `roleta-distribuir` via `pg_net`

---

## Fase 3: Frontend -- Administracao de Roletas

### 3.1 Nova aba "Roletas" no AdminSidebar

Adicionar item de navegacao `{ id: "roletas", label: "Roletas", icon: Shuffle }` no sidebar e bottom nav.

### 3.2 Componente `src/components/admin/RoletaManagement.tsx`

Painel principal com:

- **Lista de roletas** com cards mostrando: nome, lider, empreendimentos, membros online, status (ativa/inativa)
- **Criar/Editar roleta**: formulario com nome, selecao de lider, timeout
- **Vincular empreendimentos**: checkboxes (com validacao de unicidade)
- **Gerenciar membros**: adicionar corretores, definir ordem (drag-and-drop), ativar/inativar
- **Fila em tempo real**: visualizacao da ordem e proximo da vez
- **Log de distribuicao**: historico de atribuicoes

### 3.3 Alteracao em `BrokerManagement.tsx`

- Adicionar campo "Lider" (select) no formulario de criacao/edicao de corretor
- Ao criar um lider, atribuir role `leader` na tabela `user_roles`
- Exibir hierarquia lider > corretores na listagem

### 3.4 Botoes no LeadDetailSheet

Quando o lead tem `roleta_id`:
- **"Iniciar Atendimento"**: seta `atendimento_iniciado_em`, cancela timeout
- **"Transferir Lead"** (admin/lider): seleciona corretor e transfere
- **"Redistribuir via Roleta"** (admin/lider): forca nova distribuicao

### 3.5 Indicadores visuais no KanbanCard

- Badge indicando "Via Roleta" quando lead veio por distribuicao automatica
- Countdown do timeout quando `reserva_expira_em` esta ativo
- Indicador de fallback quando atribuido ao lider

---

## Fase 4: Check-in do Corretor

### 4.1 Componente no painel do corretor

No `BrokerAdmin`, adicionar secao "Minhas Roletas" com:
- Lista de roletas das quais e membro
- Botao "Check-in" / "Check-out" por roleta
- Visualizacao da ordem da fila (somente leitura)

---

## Fase 5: Notificacoes

### 5.1 Reutilizar sistema existente

- Inserir na tabela `notifications` ao atribuir lead
- Reutilizar edge function `notify-new-lead` para WhatsApp
- Mensagem padrao: "Novo lead do [Empreendimento] atribuido a voce. Nome: [Nome]. Telefone: [Telefone]."

---

## Fase 6: Cron Job

### 6.1 Agendar via pg_cron

```sql
SELECT cron.schedule(
  'roleta-timeout-check',
  '* * * * *',
  $$ SELECT net.http_post(...) $$
);
```

Chama `roleta-timeout` a cada minuto.

---

## Resumo de Arquivos

### Criar:
- `src/components/admin/RoletaManagement.tsx` -- painel completo de gestao de roletas
- `src/components/admin/RoletaCard.tsx` -- card individual de roleta
- `src/components/admin/RoletaMembrosManager.tsx` -- gestao de membros e fila
- `src/components/admin/RoletaLogTable.tsx` -- historico de distribuicoes
- `src/components/broker/BrokerRoletas.tsx` -- check-in/checkout do corretor
- `src/hooks/use-roletas.ts` -- hook para CRUD de roletas
- `src/types/roleta.ts` -- tipos TypeScript
- `supabase/functions/roleta-distribuir/index.ts` -- distribuicao round-robin
- `supabase/functions/roleta-timeout/index.ts` -- processamento de timeouts

### Editar:
- `src/components/admin/AdminSidebar.tsx` -- nova aba "Roletas"
- `src/components/admin/MobileBottomNav.tsx` -- nova aba mobile
- `src/components/admin/BrokerManagement.tsx` -- campo lider_id, criar lideres
- `src/components/crm/LeadDetailSheet.tsx` -- botoes de atendimento/transferencia/redistribuicao
- `src/components/crm/KanbanCard.tsx` -- badges visuais de roleta
- `src/pages/Admin.tsx` -- renderizar tab "roletas"
- `src/pages/BrokerAdmin.tsx` -- secao "Minhas Roletas"
- `src/types/crm.ts` -- novos campos no CRMLead, novos InteractionTypes
- `src/hooks/use-user-role.ts` -- suportar role "leader"
- `supabase/config.toml` -- registrar novas edge functions
- Migracoes SQL para todas as alteracoes de schema

### Migracao de banco: 1 migracao com todas as alteracoes de schema (tabelas, enums, indices, RLS, triggers)

---

## Consideracoes de Seguranca

- Todas as tabelas com RLS habilitado
- Admins e Leaders com acesso total as roletas
- Corretores so veem roletas das quais sao membros
- Lock transacional (`FOR UPDATE`) para evitar race conditions na distribuicao
- Validacao de unicidade de empreendimento por roleta ativa via indice parcial unico

