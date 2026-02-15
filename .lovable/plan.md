

# Resolver Lentidao e Travamento na Tela "Verificando autenticacao..."

## Problema Identificado

O fluxo atual quando o corretor clica no atalho para o CRM executa varias verificacoes redundantes e sequenciais:

1. **Auth.tsx** - Verifica sessao + busca role no banco + redireciona para `/corretor/admin`
2. **BrokerAdmin.tsx** - Verifica sessao novamente + `useUserRole` busca role de novo + busca broker_id
3. **useUserRole** - Faz 3 chamadas sequenciais ao banco: `getSession` -> `user_roles` -> `brokers`
4. **Listeners duplicados** - `onAuthStateChange` esta configurado em Auth.tsx, BrokerAdmin.tsx e useUserRole.ts, disparando a mesma logica multiplas vezes (inclusive em token refresh)

Resultado: ate 6-8 chamadas ao banco antes do corretor ver o CRM, com race conditions que podem causar loops ou travamentos.

## Solucao

### 1. Otimizar `useUserRole` - eliminar chamadas duplicadas

- Combinar a busca de `user_roles` e `brokers` em uma unica query usando join ou fazendo ambas em paralelo com `Promise.all`
- Adicionar cache local (ref) para evitar re-fetches durante token refresh
- Ignorar eventos de `onAuthStateChange` do tipo `TOKEN_REFRESHED` (nao muda role)
- Adicionar flag para evitar chamadas concorrentes

### 2. Otimizar `Auth.tsx` - remover a race condition

- Remover a verificacao duplicada: usar apenas `onAuthStateChange` com `INITIAL_SESSION` ao inves de chamar `getSession` separadamente
- Isso elimina a possibilidade de dois redirects simultaneos

### 3. Otimizar `BrokerAdmin.tsx` - remover listener redundante

- Remover o `onAuthStateChange` local do BrokerAdmin, pois o `useUserRole` ja monitora o estado de autenticacao
- Usar apenas o estado de `useUserRole` para decidir se redireciona para `/auth`

## Detalhes Tecnicos

### `src/hooks/use-user-role.ts`
- Usar `Promise.all` para buscar `user_roles` e `brokers` em paralelo (reduz de 3 chamadas sequenciais para 2 em paralelo)
- Filtrar eventos do `onAuthStateChange`: so re-executar em `SIGNED_IN`, `SIGNED_OUT`, `INITIAL_SESSION`
- Adicionar `useRef` para evitar chamadas concorrentes (debounce por flag)

### `src/pages/Auth.tsx`
- Substituir o padrao `onAuthStateChange` + `getSession` separado por apenas `onAuthStateChange` que ja recebe `INITIAL_SESSION`
- Isso elimina a race condition que causa o travamento na tela "Verificando autenticacao..."

### `src/pages/BrokerAdmin.tsx`
- Remover o `useEffect` com `onAuthStateChange` (linhas 44-60), ja que `useUserRole` cuida disso
- Simplificar: se `!isRoleLoading && !role`, redirecionar para `/auth`

### Resultado esperado
- Tempo de carregamento reduzido em ~50-60% (menos chamadas, em paralelo)
- Eliminacao do travamento na tela "Verificando autenticacao..."
- Menos listeners ativos consumindo recursos

