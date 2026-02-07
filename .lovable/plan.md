

# Melhorar Navegacao Mobile do Corretor

## Problema

A barra inferior mobile (BrokerBottomNav) tem apenas 5 itens: Notificacoes, Kanban, Adicionar (FAB), Lista e Sair. Nao existe forma de acessar o WhatsApp ou Empreendimentos no mobile -- funcionalidades que estao disponiveis na sidebar desktop.

## Solucao

Substituir o botao "Sair" por um botao "WhatsApp" e adicionar um botao "Mais" que abre um menu com as opcoes restantes (Lista, Empreendimentos, Sair). Isso expoe o WhatsApp como item de navegacao primaria no mobile, mantendo o design minimalista com 5 slots.

### Nova disposicao da barra inferior:

```text
[Notificacoes]  [Kanban]  [+ FAB]  [WhatsApp]  [Mais ...]
```

O botao "Mais" abre um Sheet (painel inferior) com:
- Modo Lista (alternar visualizacao)
- Empreendimentos (navegar para /corretor/empreendimentos)
- Sair (logout)

## Arquivos afetados

### 1. `src/components/broker/BrokerBottomNav.tsx`

**Mudancas:**
- Substituir o item "list" e "logout" por "whatsapp" (icone MessageSquare, navega para `/corretor/whatsapp`) e "more" (icone MoreHorizontal)
- Adicionar estado local para controlar o Sheet do menu "Mais"
- O Sheet do "Mais" contem 3 opcoes:
  - **Lista**: alterna para modo lista (chama `onViewChange("list")`)
  - **Empreendimentos**: navega para `/corretor/empreendimentos`
  - **Sair**: executa logout
- O item WhatsApp fica destacado (texto verde) quando a rota atual e `/corretor/whatsapp`
- O item Kanban continua com highlight amarelo quando ativo

### 2. `src/components/broker/BrokerLayout.tsx`

Nenhuma mudanca estrutural necessaria. O BrokerBottomNav ja recebe todas as props necessarias. Apenas sera necessario passar a prop da rota atual (via useLocation) caso queiramos destacar o WhatsApp como ativo -- mas isso ja pode ser feito internamente no BrokerBottomNav com `useLocation`.

### 3. `src/pages/BrokerWhatsApp.tsx`

Nenhuma mudanca necessaria -- a pagina ja renderiza o BrokerBottomNav. O botao WhatsApp ficara automaticamente destacado quando o usuario estiver nessa rota.

## Detalhes Tecnicos

### Novo layout dos itens no BrokerBottomNav:

```typescript
const navItems = [
  { id: "notifications", icon: Bell, badge: unreadCount },
  { id: "kanban", icon: LayoutDashboard },
  { id: "add", icon: Plus, isFab: true },
  { id: "whatsapp", icon: MessageSquare },
  { id: "more", icon: MoreHorizontal },
];
```

### Logica de destaque:
- "kanban": amarelo quando `viewMode === "kanban"` e rota e `/corretor/admin`
- "whatsapp": verde quando rota e `/corretor/whatsapp`
- Os demais: cinza padrao

### Sheet do "Mais":
- Usa o componente Sheet existente (do shadcn) com `side="bottom"`
- Estilo consistente com o Sheet de notificacoes ja existente no BrokerLayout
- 3 botoes grandes e claros com icone + texto, faceis de tocar no mobile
- O Sheet fecha automaticamente apos qualquer acao

## Resultado esperado

- O corretor consegue acessar o WhatsApp diretamente pela barra inferior no mobile
- Empreendimentos e Sair ficam acessiveis via menu "Mais"
- A alternancia Kanban/Lista continua funcionando (Kanban na barra, Lista no menu Mais)
- O design minimalista com 5 slots e mantido
- O FAB amarelo central (Adicionar Lead) permanece inalterado

