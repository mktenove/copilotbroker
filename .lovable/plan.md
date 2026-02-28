

## Analise Completa do Sistema - Estado Atual e Proximos Passos

### Estado Atual

**Banco de dados**: 0 tenants, 0 brokers, 0 leads, 0 projetos, 0 memberships. O sistema esta completamente vazio.

**Usuario cadastrado**: `maicon.enove@gmail.com` (role: admin/super_admin). Porem, ele nao tem tenant, nao tem broker record, e nao tem membership. Ou seja, ele e super admin mas nao pode acessar as areas protegidas do CRM porque o `SubscriptionGuard` exige um tenant ativo.

---

### Problemas Criticos Identificados

1. **Loop de redirecionamento para o super admin**: O usuario `maicon.enove@gmail.com` ao acessar `/admin` ou `/corretor/admin` e redirecionado para `/planos` porque nao tem tenant. Mas o super admin nao deveria precisar de tenant para operar.

2. **Cadastro de corretor (`/corretor/cadastro`) nao cria tenant nem membership**: O `BrokerSignup` cria apenas o registro em `brokers` sem `tenant_id` e sem `tenant_memberships`. O corretor ficara preso no `SubscriptionGuard` apos cadastro.

3. **"Adicionar Broker" no Super Admin nao vincula quando o broker ainda nao existe**: Se o email ainda nao tem conta, o tenant e criado mas fica orfao (sem owner, sem membership).

4. **Fluxo de assinatura Stripe incompleto para novos clientes**: O `Onboarding` espera que o webhook do Stripe ja tenha criado tenant + membership, mas nao ha garantia de timing.

---

### Proximos Passos - Ordem de Prioridade

#### 1. Bypass do SubscriptionGuard para Super Admin
O super admin precisa acessar `/admin` e outras rotas sem ter tenant. O `SubscriptionGuard` deve verificar `is_super_admin()` e liberar acesso.

**Mudanca**: Alterar `SubscriptionGuard.tsx` para checar a role do usuario em `user_roles` e, se for `admin`, liberar sem exigir tenant.

#### 2. Criar Tenant para o Super Admin
Criar um tenant "Enove" via SQL e vincular `maicon.enove@gmail.com` como owner com membership ativa. Isso permite operar o CRM normalmente.

**Mudanca**: Migration SQL inserindo tenant + membership + entitlements.

#### 3. Corrigir Fluxo do BrokerSignup
Apos o corretor se cadastrar em `/corretor/cadastro`, ele precisa de um tenant para operar. Duas opcoes:
- **Opcao A**: Redirecionar para `/planos` para assinar (fluxo self-service via Stripe)
- **Opcao B**: O super admin cria o tenant antes e convida o corretor (fluxo gerenciado)

**Recomendacao**: Manter ambos. O signup cria a conta, e o super admin vincula via "Adicionar Broker". Se quiser self-service, o corretor segue para `/planos`.

#### 4. Melhorar "Adicionar Broker" no Super Admin
Quando o email ainda nao tem conta, salvar o `tenant_id` em um estado pendente para que, quando o usuario se cadastrar, seja automaticamente vinculado. Ou adicionar funcionalidade de criar o broker record diretamente.

**Mudanca**: Adicionar campo `owner_email` no tenant. Criar trigger/logica no signup que verifica se existe tenant pendente para aquele email e auto-vincula.

#### 5. Cadastro de Empreendimentos (Projects)
O super admin precisa cadastrar empreendimentos para que os corretores possam receber leads. Criar um formulario de cadastro de projetos no painel Super Admin.

**Mudanca**: Novo componente `AddProjectModal` com campos: nome, cidade, slug, status. Inserir em `projects` com `tenant_id`.

#### 6. Vincular Corretor a Empreendimento
Depois de ter projetos, o admin precisa associar corretores a empreendimentos via `broker_projects`.

**Mudanca**: Interface no admin para gerenciar vinculacoes broker <-> projeto.

---

### Resumo da Ordem de Implementacao

| # | Tarefa | Tipo |
|---|--------|------|
| 1 | Bypass SubscriptionGuard para super admin | Codigo |
| 2 | Criar tenant "Enove" + vincular maicon | SQL |
| 3 | Auto-vincular broker ao tenant no signup | Codigo + SQL |
| 4 | Cadastro de empreendimentos no Super Admin | Codigo |
| 5 | Vincular corretor a empreendimento | Codigo |
| 6 | Testar fluxo completo end-to-end | Teste |

Deseja que eu comece implementando os itens 1 e 2 (liberar super admin + criar tenant Enove)?

