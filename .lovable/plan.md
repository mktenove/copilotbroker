

## Plan: Redesign Completo do Painel Super Admin

O objetivo é alinhar o visual do Super Admin com o design premium do Admin panel (sidebar icon-only fixa, header com breadcrumb, cores consistentes, tipografia refinada). Nenhum botão, módulo ou funcionalidade será removido.

### Mudanças Arquiteturais

O Admin usa: `AdminLayout` (wrapper) → `AdminSidebar` (sidebar icon-only w-16, fixa) → `AdminHeader` (breadcrumb sticky) → conteúdo. O Super Admin hoje usa um layout com sidebar expandível (w-16/w-56) que é diferente visualmente.

**Estratégia**: Refatorar `SuperAdminLayout` para usar o mesmo padrão icon-only do `AdminSidebar`, e remover os headers internos redundantes de cada página (já que o layout terá o header padrão).

### Arquivos a Editar (13 arquivos)

**1. `src/components/super-admin/SuperAdminLayout.tsx`** — Reescrever
- Sidebar icon-only fixa (w-16), sem modo expandido
- Mesma estética: bg-[#141417], border-r border-[#2a2a2e]
- Logo copilot-icon no topo
- Nav items com tooltips (como AdminSidebar)
- Active indicator bar lateral amarela
- Bottom: Settings icon + Avatar/Logout
- Header sticky com breadcrumb (Admin › Página · Subtítulo)
- Conteúdo com ml-16, padding p-3 md:p-6

**2. `src/pages/super-admin/SuperAdminDashboard.tsx`** — Redesign
- Remover header interno (já no layout)
- Manter todos os KPIs, search, tabela, TenantDetailSheet
- Aplicar estilos consistentes: rounded-xl nos cards, espaçamentos padronizados

**3. `src/pages/super-admin/SuperAdminBrokers.tsx`** — Redesign
- Remover header interno e verificação de auth redundante (layout já protege)
- Manter: KPIs, filtros (search, status, stripe), tabela, export CSV, bulk actions, detail sheet
- Mover botões de ação para a área do header do layout ou manter inline

**4. `src/pages/super-admin/SuperAdminRealEstate.tsx`** — Redesign
- Remover header interno
- Manter todos: KPIs (6 cards), filtros avançados, sorting, paginação, batch actions, CSV, tabela completa com checkbox, dropdown actions

**5. `src/pages/super-admin/SuperAdminBilling.tsx`** — Redesign
- Remover header interno
- Manter search, tabela de billing events

**6. `src/pages/super-admin/SuperAdminBillingEvents.tsx`** — Redesign
- Remover header interno
- Manter todos os filtros (search, processed, type), tabela com payload details, botão reprocessar

**7. `src/pages/super-admin/SuperAdminAudit.tsx`** — Redesign
- Remover header interno
- Manter search, tabela de audit logs com badges coloridos

**8. `src/pages/super-admin/SuperAdminAffiliates.tsx`** — Redesign
- Remover header interno
- Manter placeholder "Em breve" com visual alinhado

**9. `src/pages/super-admin/SuperAdminInvites.tsx`** — Redesign
- Remover header/wrapper `min-h-screen bg-[#0a0a0c]` (layout cuida)
- Manter tabela completa com ações (copy, resend, cancel)

**10. `src/pages/super-admin/SuperAdminRealEstateInvites.tsx`** — Redesign
- Mesma abordagem do SuperAdminInvites

**11. `src/pages/super-admin/SuperAdminRealEstateNew.tsx`** — Redesign
- Remover wrapper de bg/header
- Manter formulário completo (seções A-G), checkout link, todas as opções

**12. `src/pages/super-admin/SuperAdminAddBroker.tsx`** — Redesign
- Remover wrapper de bg/header
- Manter formulário, invite result, checkout URL

**13. `src/pages/SuperAdmin.tsx`** — Ajustar
- Já redirecionado pelo layout; verificar se ainda precisa de auth check própria ou se pode simplificar

### Design System Aplicado

```text
┌──────────────────────────────────────────────┐
│ [icon] │  Admin › Dashboard · Visão geral    │
│  logo  │─────────────────────────────────────│
│        │                                      │
│  [📊]  │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  [🏢]  │   │ KPI │ │ KPI │ │ KPI │ │ KPI │ │
│  [👥]  │   └─────┘ └─────┘ └─────┘ └─────┘ │
│  [🤝]  │                                     │
│  [💳]  │   ┌──────────────────────────────┐  │
│  [📋]  │   │        Table / Content       │  │
│  [📝]  │   │                              │  │
│        │   └──────────────────────────────┘  │
│ ──────-│                                      │
│  [⚙️]  │                                      │
│  [👤]  │                                      │
└──────────────────────────────────────────────┘
```

- Sidebar: w-16, bg-[#141417], icons com tooltip
- Active: bg-primary/20 + barra lateral amarela 3px
- Header: sticky, bg-[#141417]/95 backdrop-blur, breadcrumb
- Content: bg-[#0f0f12], p-6
- Cards: bg-[#1e1e22], border-[#2a2a2e], rounded-xl
- Tables: dentro de cards rounded-xl, rows com hover
- Accent: #FFFF00 para CTAs e indicadores ativos
- Tipografia: font-mono para dados, text-sm para tabelas

### Preservação Total de Funcionalidades

Cada página mantém:
- Todos os botões de ação (Adicionar, Refresh, Export, Filtros, Bulk actions)
- Todos os KPI cards com filtros clicáveis
- Todas as tabelas com colunas originais
- Todos os modais/sheets (TenantDetailSheet, BrokerDetailSheet, AddTenantModal)
- Todos os filtros (search, status, stripe, type, etc.)
- Paginação e sorting onde existem
- Navegação entre sub-páginas (invites, new, etc.)

