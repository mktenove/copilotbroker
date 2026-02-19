

# Adicionar filtro por corretor nas abas Campanhas e Fila (Admin)

## Contexto

Atualmente, tanto a aba "Campanhas" quanto a aba "Fila" filtram dados pelo corretor logado. Como o admin nao e um corretor, ele ve apenas campanhas/filas gerais. Precisamos de um seletor de corretor nessas abas para que o admin possa inspecionar os dados de cada corretor individualmente.

## Alteracoes

### 1. Hook `use-whatsapp-campaigns.ts`

- Aceitar parametro opcional `brokerFilterId` no hook
- Quando `role === "admin"` e `brokerFilterId` estiver preenchido, filtrar campanhas por esse `broker_id`
- Quando `role === "admin"` e `brokerFilterId` estiver vazio, mostrar todas as campanhas (comportamento atual)

### 2. Hook `use-whatsapp-queue.ts`

- Aceitar parametro opcional `brokerFilterId`
- Quando `role === "admin"` e `brokerFilterId` estiver preenchido, usar esse ID em vez do `broker?.id` para todas as queries (lista, contadores, respostas)
- Quando `role === "admin"` e `brokerFilterId` estiver vazio, mostrar dados de **todos** os corretores (remover filtro `broker_id`)
- Ajustar as queries agregadas e realtime para usar o ID efetivo

### 3. Componente `CampaignsTab.tsx`

- Adicionar state `selectedBrokerId`
- Buscar lista de corretores ativos (query simples em `brokers`)
- Renderizar um `Select` com opcao "Todos os corretores" + lista de corretores, visivel apenas para admin
- Passar `selectedBrokerId` para `useWhatsAppCampaigns`
- Filtrar campanhas exibidas pelo corretor selecionado

### 4. Componente `QueueTab.tsx`

- Adicionar state `selectedBrokerId`
- Buscar lista de corretores ativos
- Renderizar um `Select` identico ao de Campanhas, visivel apenas para admin
- Passar `selectedBrokerId` para `useWhatsAppQueue`
- Stats e lista refletem o corretor selecionado

## Detalhes tecnicos

### Arquivos editados

| Arquivo | Alteracao |
|---|---|
| `src/hooks/use-whatsapp-campaigns.ts` | Aceitar `brokerFilterId?: string`, filtrar query de campanhas quando admin seleciona corretor |
| `src/hooks/use-whatsapp-queue.ts` | Aceitar `brokerFilterId?: string` e `role`, usar ID efetivo em todas as queries e realtime |
| `src/components/whatsapp/CampaignsTab.tsx` | Adicionar Select de corretores (admin only), passar filtro para hook |
| `src/components/whatsapp/QueueTab.tsx` | Adicionar Select de corretores (admin only), passar filtro para hook |

### Logica do filtro

- **"Todos os corretores"** (valor vazio): nao aplica `.eq("broker_id", ...)` nas queries, retornando dados de todos
- **Corretor especifico**: aplica `.eq("broker_id", selectedId)` em todas as queries
- Para corretores nao-admin, nada muda: o filtro pelo proprio `broker_id` continua sendo aplicado automaticamente

### UX do seletor

- Posicionado ao lado do titulo da aba, no header
- Estilo consistente com o design escuro existente (`bg-[#1a1a1d] border-[#2a2a2e]`)
- Opcao padrao: "Todos os corretores"
- Lista ordenada alfabeticamente pelo nome do corretor
