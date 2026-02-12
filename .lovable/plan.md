

## Corrigir papel do Lider: Corretor com acesso a Roletas, nao Admin

### Contexto

Atualmente o sistema trata o lider como quase-admin, redirecionando-o para `/admin`. Na verdade, o lider e um **corretor normal** que tem uma atribuicao extra: **gerenciar roletas**. Ele deve usar o dashboard de corretor (`/corretor/admin`) com seus proprios leads, e ter acesso adicional a gestao de roletas.

### Mudancas necessarias

**1. Hook `useUserRole` (`src/hooks/use-user-role.ts`)**
- Inverter a prioridade: se o usuario tem `broker` E `leader`, o role resolvido deve ser `broker` (nao `leader`)
- Adicionar um campo `isLeader: boolean` ao retorno do hook para saber se o usuario tambem e lider
- Manter `brokerId` sendo buscado para ambos

**2. Pagina de Auth (`src/pages/Auth.tsx`)**
- Atualizar `checkUserRoleAndRedirect`: lideres devem ir para `/corretor/admin`, nao `/admin`
- Buscar todas as roles do usuario (nao apenas `maybeSingle`) para verificar se tem `broker` ou `leader`

**3. Pagina BrokerAdmin (`src/pages/BrokerAdmin.tsx`)**
- Remover o redirect de lideres para `/admin` (linha 63)
- Permitir que lideres fiquem no dashboard de corretor
- Aceitar role `broker` OU `leader` como valido para esta pagina

**4. Sidebar do Corretor (`src/components/broker/BrokerSidebar.tsx`)**
- Adicionar item "Roletas" no menu lateral, visivel apenas para lideres
- Navegar para uma nova rota `/corretor/roletas`

**5. Bottom Nav Mobile (`src/components/broker/BrokerBottomNav.tsx`)**
- Adicionar icone de Roletas para lideres na navegacao mobile

**6. Nova rota e pagina**
- Criar rota `/corretor/roletas` no `App.tsx`
- Esta rota renderiza o componente `RoletaManagement` existente dentro do `BrokerLayout`
- Apenas lideres podem acessar

**7. Pagina Admin (`src/pages/Admin.tsx`)**
- Remover `leader` do acesso permitido (linha 411: `role !== "admin"`)
- Lideres nao devem mais acessar o painel admin

**8. RLS no banco de dados**
- Adicionar policies para `leader` na tabela `leads`: lider pode ver leads dos corretores da sua equipe (onde `brokers.lider_id` = broker_id do lider)
- Adicionar policies similares em `lead_interactions`, `lead_documents`, `lead_attribution`
- Isso permite que o lider veja dados da equipe no contexto de roletas

---

### Detalhes tecnicos

**`src/hooks/use-user-role.ts`** - Retorno atualizado:
```
{
  role: "broker",       // prioridade: broker > leader (admin continua acima de tudo)
  isLeader: true,       // flag separada
  isLoading: false,
  brokerId: "uuid..."
}
```

**`src/pages/Auth.tsx`** - Nova logica de redirect:
- Se tem role `admin` -> `/admin`
- Se tem role `broker` ou `leader` -> `/corretor/admin`
- Buscar com `.select("role")` sem `maybeSingle` para pegar todas as roles

**`src/components/broker/BrokerSidebar.tsx`** - Novo item condicional:
- Prop `isLeader?: boolean`
- Se `isLeader`, mostrar botao "Roletas" com icone `RotateCw` que navega para `/corretor/roletas`

**`src/pages/Admin.tsx`** - Restringir acesso:
- Linha 411: trocar `role !== "admin" && role !== "leader"` por `role !== "admin"`
- Redirect de lider na linha ~103: redirecionar para `/corretor/admin`

**Nova pagina `src/pages/BrokerRoletasPage.tsx`**:
- Usa `BrokerLayout` como wrapper
- Renderiza `RoletaManagement` (componente que ja existe em `src/components/admin/RoletaManagement.tsx`)
- Verifica se usuario e lider, caso contrario redireciona

**`src/App.tsx`** - Nova rota:
- Adicionar `/corretor/roletas` apontando para `BrokerRoletasPage`

**Migracao SQL** - RLS policies para leader ver leads da equipe:
- SELECT em `leads` onde `broker_id IN (SELECT id FROM brokers WHERE lider_id = get_my_broker_id())`
- SELECT/INSERT em `lead_interactions` para leads da equipe
- SELECT em `lead_documents` e `lead_attribution` para leads da equipe

