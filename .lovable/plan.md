## Redesign da Pagina de Corretores com Gestao de Times, Lideres e Equipes

### Visao geral

Unificar a gestao de corretores em uma unica pagina com **3 sub-abas** (via Tabs), substituindo a pagina atual de cards simples por uma interface organizada por **hierarquia de times**. A pagina de Roletas permanece separada no menu lateral, pois tem proposito operacional distinto. 

### Estrutura da nova pagina

A tab "Corretores" no menu lateral abrira uma pagina com **3 sub-tabs**:

1. **Equipes** (tab padrao) -- Visao agrupada por lider
2. **Todos os Corretores** -- Lista/grid completa como hoje, com melhorias
3. **Lideres** -- Gestao dos lideres (atribuir role leader, ver equipes sob cada lider)

---

### Tab 1: Equipes (visao principal)

- Agrupa corretores pelo campo `lider_id` da tabela `brokers`
- Cada grupo mostra o lider como cabecalho com avatar, nome, total de membros, e quantidade de leads da equipe
- Abaixo do cabecalho, lista compacta dos corretores vinculados ao lider (mini-cards em grid)
- Corretores **sem lider** aparecem em um grupo "Sem equipe" no final
- Cada corretor exibe: nome, status (ativo/inativo), quantidade de leads, ultimo acesso
- Botao para arrastar/mover corretor entre equipes (ou select para atribuir lider)
- Botao "Atribuir Lider" direto no card do corretor sem equipe

### Tab 2: Todos os Corretores

- Mesmo grid de cards que existe hoje, com melhorias visuais:
  - Adicionar coluna/badge do lider vinculado
  - Adicionar badge de roletas ativas onde o corretor participa
  - Manter funcionalidades existentes (editar, excluir, copiar link, historico)

### Tab 3: Lideres

- Lista dos corretores que possuem role `leader` na tabela `user_roles`
- Para cada lider: nome, quantidade de corretores na equipe, roletas que lidera, total de leads da equipe
- Botao para **promover corretor a lider** (insere role `leader` em `user_roles`)
- Botao para **remover role de lider**
- Ao promover, o corretor aparece como opcao de lider na atribuicao de equipes

---

### Detalhes tecnicos

**Arquivo principal: `src/components/admin/BrokerManagement.tsx**`

- Refatorar para incluir `Tabs` do Radix (componente ja disponivel em `src/components/ui/tabs.tsx`)
- Tab "Equipes": novo componente `TeamView` que agrupa brokers por `lider_id`
- Tab "Todos": manter logica atual com grid de cards, adicionando badge de lider
- Tab "Lideres": novo componente `LeaderManagement`

**Novos componentes:**

- `src/components/admin/TeamView.tsx` -- Visao de equipes agrupadas por lider
- `src/components/admin/LeaderManagement.tsx` -- Gestao de lideres (promover/remover role)

**Dados necessarios (ja existentes no banco):**

- `brokers.lider_id` -- vinculo corretor-lider (ja existe, nenhum corretor tem lider atribuido atualmente)
- `user_roles` com role `leader` -- define quem e lider
- `roletas.lider_id` -- roletas sob cada lider

**Operacoes de banco:**

- Atribuir lider: `UPDATE brokers SET lider_id = :liderId WHERE id = :brokerId`
- Promover a lider: `INSERT INTO user_roles (user_id, role) VALUES (:userId, 'leader')`
- Remover role lider: `DELETE FROM user_roles WHERE user_id = :userId AND role = 'leader'`
- Nenhuma migracao necessaria -- todas as tabelas e colunas ja existem

**Ajustes no formulario de edicao:**

- Adicionar campo "Lider" (select com lista de corretores que tem role leader) no dialog de criar/editar corretor

**Design:**

- Seguir a estetica dark luxury existente (#1e1e22, #2a2a2e, primary yellow)
- Cards compactos, tipografia refinada, sem elementos genericos
- Badges minimalistas para status, role e lider