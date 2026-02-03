
# Redesign Premium - Página de Corretores

## Objetivo
Transformar a página de gerenciamento de corretores de uma tabela tradicional para um layout moderno com cards premium clicáveis que abrem o histórico de atividades do corretor.

---

## Nova Interface Visual

### Layout: Cards em Grid

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Corretores                                           [+ Novo Corretor]  │
│ 18 corretores ativos                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐            │
│  │  ●                  ✓    │  │  ●                  ✓    │            │
│  │                          │  │                          │            │
│  │  João Gabriel            │  │  Maria Silva             │            │
│  │  joao@imob.com           │  │  maria@imob.com          │            │
│  │                          │  │                          │            │
│  │  ┌────────┐ ┌────────┐   │  │  ┌────────┐ ┌────────┐   │            │
│  │  │  15    │ │ Há 2h  │   │  │  │  23    │ │ Ontem  │   │            │
│  │  │ leads  │ │ acesso │   │  │  │ leads  │ │ acesso │   │            │
│  │  └────────┘ └────────┘   │  │  └────────┘ └────────┘   │            │
│  │                          │  │                          │            │
│  │  GoldenView  Estância V  │  │  Maurício C.             │            │
│  │                          │  │                          │            │
│  │  ─────────────────────   │  │  ─────────────────────   │            │
│  │  [Copiar Link] [✏️] [🗑️] │  │  [Copiar Link] [✏️] [🗑️] │            │
│  └──────────────────────────┘  └──────────────────────────┘            │
│                                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐            │
│  │  ○                  ✗    │  │  ●                  ✓    │            │
│  │                          │  │                          │            │
│  │  Pedro Santos (inativo)  │  │  Ana Costa               │            │
│  │  ...                     │  │  ...                     │            │
│  └──────────────────────────┘  └──────────────────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes do Redesign

### 1. Card do Corretor (Clicável)
- **Estrutura visual:**
  - Avatar com inicial do nome (gradiente colorido)
  - Badge de status (ativo/inativo) no canto superior direito
  - Nome e email do corretor
  - Métricas em mini-cards: Leads atendidos + Último acesso
  - Tags dos projetos associados
  - Barra de ações na parte inferior

- **Interação:**
  - Clicar no card abre o BrokerActivitySheet
  - Hover sutil com elevação (scale + shadow)
  - Botões de ação (editar, excluir, copiar) param propagação

### 2. Header Aprimorado
- Contador de corretores ativos/total
- Botão "Novo Corretor" com destaque
- Filtro rápido (ativos/inativos/todos)

### 3. Grid Responsivo
- Desktop: 3 colunas
- Tablet: 2 colunas  
- Mobile: 1 coluna

---

## Detalhes de Estilo Premium

### Paleta de Cores (consistente com dark theme)
- Background cards: `#1e1e22`
- Background hover: `#252528`
- Bordas: `#2a2a2e`
- Accent (ativo): `#FFFF00`
- Status inativo: `#ef4444`
- Métricas: gradientes sutis

### Tipografia
- Nome: `text-lg font-semibold text-white`
- Email: `text-sm text-slate-400`
- Métricas: `text-xl font-bold` com labels `text-xs text-slate-500`

### Animações
- Hover: `transform scale-[1.02]` + `shadow-lg`
- Transição suave: `transition-all duration-200`

---

## Alterações Técnicas

### Arquivo: `src/components/admin/BrokerManagement.tsx`

1. **Substituir tabela por grid de cards**
   - Remover `<table>` e substituir por `<div className="grid">`
   - Criar componente interno `BrokerCard`

2. **Tornar card clicável**
   - `onClick={() => setSelectedBrokerForHistory(broker)}`
   - Botões de ação usam `e.stopPropagation()`

3. **Adicionar métricas visuais**
   - Avatar com inicial colorida
   - Mini-cards para leads e último acesso
   - Status badge no canto

4. **Header aprimorado**
   - Adicionar contador de corretores
   - Opcional: filtro de status

---

## Estrutura do Card Premium

```tsx
<div 
  onClick={() => setSelectedBrokerForHistory(broker)}
  className="
    bg-[#1e1e22] border border-[#2a2a2e] rounded-2xl p-5
    cursor-pointer group
    hover:bg-[#252528] hover:border-[#3a3a3e]
    hover:shadow-xl hover:shadow-black/20
    hover:scale-[1.02]
    transition-all duration-200
  "
>
  {/* Header: Avatar + Status */}
  <div className="flex items-start justify-between mb-4">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 
                    flex items-center justify-center">
      <span className="text-lg font-bold text-white">
        {broker.name.charAt(0).toUpperCase()}
      </span>
    </div>
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
      broker.is_active 
        ? 'bg-[#FFFF00]/10 text-[#FFFF00] border border-[#FFFF00]/20'
        : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      {broker.is_active ? 'Ativo' : 'Inativo'}
    </span>
  </div>

  {/* Info */}
  <h3 className="text-lg font-semibold text-white mb-1">{broker.name}</h3>
  <p className="text-sm text-slate-400 mb-4">{broker.email}</p>

  {/* Métricas */}
  <div className="grid grid-cols-2 gap-3 mb-4">
    <div className="bg-[#0f0f12] rounded-xl p-3 text-center">
      <p className="text-xl font-bold text-white">{leadsCount}</p>
      <p className="text-xs text-slate-500">leads</p>
    </div>
    <div className="bg-[#0f0f12] rounded-xl p-3 text-center">
      <p className="text-sm font-medium text-slate-300">{lastAccess}</p>
      <p className="text-xs text-slate-500">último acesso</p>
    </div>
  </div>

  {/* Projetos */}
  <div className="flex flex-wrap gap-1.5 mb-4">
    {projects.map(p => (
      <span className="px-2 py-0.5 text-xs rounded-full 
                       bg-[#2a2a2e] text-slate-300 border border-[#3a3a3e]">
        {p.name}
      </span>
    ))}
  </div>

  {/* Ações */}
  <div className="flex items-center gap-2 pt-3 border-t border-[#2a2a2e]">
    <button onClick={e => { e.stopPropagation(); copyLink(broker.slug); }}>
      Copiar Link
    </button>
    <button onClick={e => { e.stopPropagation(); handleOpenDialog(broker); }}>
      Editar
    </button>
    <button onClick={e => { e.stopPropagation(); deleteBroker(broker); }}>
      Excluir
    </button>
  </div>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/BrokerManagement.tsx` | Substituir tabela por grid de cards premium clicáveis |

---

## Resultado Esperado

- Visual premium e moderno com cards
- Melhor hierarquia visual de informações
- Interação intuitiva (clique abre histórico)
- Métricas destacadas (leads, último acesso)
- Responsivo para todos os dispositivos
- Animações suaves de hover
- Mantém todas as funcionalidades existentes
