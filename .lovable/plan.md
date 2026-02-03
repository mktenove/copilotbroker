
# Histórico de Acessos e Registro de Atividades dos Corretores

## Objetivo
Adicionar na página de gerenciamento de corretores um sistema que mostre:
1. **Histórico de logins** de cada corretor (último acesso, total de acessos)
2. **Registro de atividades** no CRM (leads movidos, notas adicionadas, documentos processados)

---

## Arquitetura da Solução

### 1. Nova Tabela: `broker_activity_logs`
Armazenar atividades relevantes dos corretores de forma estruturada:

```sql
CREATE TABLE broker_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'login', 'lead_update', 'note_added', 'doc_processed', 'status_change'
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  details JSONB, -- metadados extras
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Nova Tabela: `broker_sessions`
Rastrear sessões de login para histórico de acessos:

```sql
CREATE TABLE broker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  logged_in_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);
```

### 3. Registro Automático de Login
Criar um hook que registra automaticamente quando um corretor faz login:
- Arquivo: `src/hooks/use-broker-session-tracker.ts`
- Registra sessão ao detectar login no auth state change

### 4. Atualização do `lead_interactions`
Aproveitar a tabela existente para vincular `broker_id` corretamente quando corretores fazem ações.

---

## Interface no Painel Admin

### Adicionar ao `BrokerManagement.tsx`:

#### Opção A: Modal de Detalhes do Corretor
Ao clicar no corretor, abrir um modal/sheet com abas:
- **Informações**: dados atuais
- **Acessos**: histórico de logins
- **Atividades**: timeline de ações no CRM

#### Opção B: Coluna Expandível
Adicionar botão "Ver histórico" que expande uma seção com:
- Último acesso
- Total de logins este mês
- Leads atendidos
- Atividades recentes

### Design Proposto

```text
┌─────────────────────────────────────────────────────────────────┐
│ Corretores                                         [+ Novo]     │
├─────────────────────────────────────────────────────────────────┤
│ Nome         │ Email       │ Último Acesso │ Leads │ Ações     │
├──────────────┼─────────────┼───────────────┼───────┼───────────┤
│ João Gabriel │ joao@...    │ Há 2 horas    │   15  │ 📊 ✏️ 🗑️ │
│ Maicon       │ maicon@...  │ Ontem 14:30   │   23  │ 📊 ✏️ 🗑️ │
└─────────────────────────────────────────────────────────────────┘

Ao clicar em 📊 (detalhes):

┌─────────────────────────────────────────────────────────────────┐
│ Histórico - João Gabriel                               [Fechar] │
├─────────────────────────────────────────────────────────────────┤
│ [Acessos] [Atividades]                                          │
├─────────────────────────────────────────────────────────────────┤
│ Acessos Recentes:                                               │
│ • 03/02 22:33 - Login via token                                 │
│ • 02/02 14:15 - Login via senha                                 │
│ • 01/02 09:20 - Login via senha                                 │
├─────────────────────────────────────────────────────────────────┤
│ Resumo do Mês:                                                  │
│ 📅 12 dias ativos  │  🔐 28 logins  │  📈 15 leads atendidos    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementação - Etapas

### Etapa 1: Banco de Dados
1. Criar tabela `broker_sessions` para rastrear logins
2. Criar tabela `broker_activity_logs` para atividades
3. Configurar RLS adequado (admins veem tudo, corretores veem só suas atividades)
4. Criar índices para performance

### Etapa 2: Rastreamento de Login
1. Criar hook `use-broker-session-tracker.ts`
2. Integrar no `BrokerLayout.tsx` e `AdminLayout.tsx`
3. Registrar sessão no primeiro load após login

### Etapa 3: Rastreamento de Atividades
1. Modificar funções de status change para registrar broker_id
2. Atualizar `use-lead-interactions.ts` para logar atividades
3. Registrar quando corretor adiciona nota, move lead, processa doc

### Etapa 4: Interface do Admin
1. Criar componente `BrokerActivitySheet.tsx`
2. Adicionar colunas "Último Acesso" e "Leads" na tabela
3. Criar hook `use-broker-activity.ts` para buscar dados
4. Implementar abas de Acessos e Atividades

---

## Detalhes Técnicos

### Políticas RLS

```sql
-- Admins veem todas as sessões
CREATE POLICY "Admins podem ver todas as sessões"
  ON broker_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Corretores veem suas próprias sessões
CREATE POLICY "Corretores veem suas sessões"
  ON broker_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Insert permitido para usuários autenticados
CREATE POLICY "Usuários podem registrar sua sessão"
  ON broker_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Hook de Rastreamento

```typescript
// src/hooks/use-broker-session-tracker.ts
export const useBrokerSessionTracker = () => {
  useEffect(() => {
    const trackSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Verificar se é corretor
      const { data: broker } = await supabase
        .from('brokers')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      
      if (broker) {
        await supabase.from('broker_sessions').insert({
          broker_id: broker.id,
          user_id: session.user.id,
        });
      }
    };
    
    trackSession();
  }, []);
};
```

### Componente de Atividades

```typescript
// src/components/admin/BrokerActivitySheet.tsx
interface BrokerActivitySheetProps {
  broker: Broker;
  isOpen: boolean;
  onClose: () => void;
}

// Mostra histórico de acessos + timeline de atividades
```

---

## Dados Mostrados

### Painel de Acessos
- Data/hora do login
- Método (senha, token/refresh)
- IP e dispositivo (se disponível)
- Tempo desde último acesso

### Painel de Atividades
- Leads movidos de status
- Notas adicionadas
- Documentos marcados como recebidos
- Leads atribuídos/cadastrados

### Métricas Resumidas
- Dias ativos no mês
- Total de logins
- Leads atendidos
- Média de atividades por dia

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/BrokerManagement.tsx` | Adicionar colunas e botão de histórico |
| `src/components/admin/BrokerActivitySheet.tsx` | **Novo** - Sheet com histórico |
| `src/hooks/use-broker-activity.ts` | **Novo** - Buscar atividades |
| `src/hooks/use-broker-session-tracker.ts` | **Novo** - Rastrear sessões |
| `src/components/broker/BrokerLayout.tsx` | Integrar tracker de sessão |
| Migration SQL | Criar tabelas broker_sessions e broker_activity_logs |

---

## Considerações

### Performance
- Índices em `broker_id` e `created_at` para queries rápidas
- Paginação no histórico de atividades
- Cache de resumos mensais

### Privacidade
- Apenas admins veem dados de todos os corretores
- Corretores podem ver seus próprios dados
- IPs e user agents opcionais (podem ser desativados)
