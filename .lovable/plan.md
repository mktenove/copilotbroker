
# Redesign Cards de Corretores - Estilo Kanban

## Objetivo
Transformar os cards de corretores para seguir o mesmo padrão visual dos cards do Kanban (KanbanCard.tsx), mantendo a funcionalidade de clique para abrir o log de atividades.

---

## Análise do KanbanCard (Referência de Estilo)

O KanbanCard possui estas características visuais:

- **Container**: `rounded-xl` (não rounded-2xl), `bg-[#1e1e22] border border-[#2a2a2e]`
- **Hover**: `hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]`
- **Padding interno**: `p-3` (mais compacto)
- **Indicadores visuais**: Barra de progresso, tags coloridas
- **Footer**: Separador com `border-t border-slate-700/50`
- **Ícones menores**: w-3.5 h-3.5 para ações
- **Avatar pequeno**: `w-5 h-5` no footer

---

## Mudanças Propostas

### 1. Container do Card

**Atual:**
```tsx
className="bg-[#1e1e22] border rounded-2xl p-5 cursor-pointer group..."
```

**Novo (estilo Kanban):**
```tsx
className={cn(
  "relative rounded-xl cursor-pointer",
  "bg-[#1e1e22] border border-[#2a2a2e]",
  "hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
  "transition-all duration-200 ease-out",
  "group overflow-hidden",
  !broker.is_active && "ring-2 ring-red-400/50"
)}
```

### 2. Estrutura Interna (mais compacta como Kanban)

```text
┌─────────────────────────────────────┐
│ [Tag Status]           [dd/mm hh:mm]│  <- Row 1: Status badge + data criação
├─────────────────────────────────────┤
│ Nome do Corretor                    │  <- Row 2: Nome destaque
│ email@corretor.com                  │  <- Row 3: Email
├─────────────────────────────────────┤
│ ████████████░░░░░░░░░░░░░░░  35%    │  <- Row 4: Barra de progresso (leads)
├─────────────────────────────────────┤
│ [GoldenView] [Maurício C.]          │  <- Row 5: Tags de projetos
├─────────────────────────────────────┤
│ [Copiar Link]      [✏️] [🗑️]        │  <- Row 6: Ações
├─────────────────────────────────────┤
│ 🔵J  │  ⏱️ Há 2h  │  👥 15 leads    │  <- Row 7: Footer com métricas
└─────────────────────────────────────┘
```

### 3. Elementos Visuais do Kanban a Adotar

| Elemento | Kanban | Implementar |
|----------|--------|-------------|
| Border radius | `rounded-xl` | Sim |
| Padding | `p-3` | Sim (mais compacto) |
| Hover shadow | `shadow-[0_8px_30px_rgb(0,0,0,0.3)]` | Sim |
| Status tag | Tags coloridas uppercase | Badge de status similar |
| Progress bar | Barra com cor por status | Barra baseada em leads |
| Footer | `border-t border-slate-700/50` | Sim |
| Timestamp | `text-[10px] text-slate-500` | Data de criação |

### 4. Barra de Progresso para Corretores

Adicionar barra visual baseada em leads:
- 0-5 leads: 20%
- 6-10 leads: 40%
- 11-20 leads: 60%
- 21-50 leads: 80%
- 50+ leads: 100%

Cores:
- Ativo: `bg-primary` (amarelo)
- Inativo: `bg-red-500`

---

## Código Resultante

```tsx
<div
  onClick={() => setSelectedBrokerForHistory(broker)}
  className={cn(
    "relative rounded-xl cursor-pointer",
    "bg-[#1e1e22] border border-[#2a2a2e]",
    "hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
    "transition-all duration-200 ease-out",
    "group overflow-hidden",
    !broker.is_active && "ring-2 ring-red-400/50"
  )}
>
  <div className="p-3">
    {/* Row 1: Status + Data de cadastro */}
    <div className="flex items-start justify-between gap-2 mb-2.5">
      <span className={cn(
        "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
        broker.is_active
          ? "bg-primary/20 text-primary border-primary/40"
          : "bg-red-500/20 text-red-400 border-red-500/40"
      )}>
        {broker.is_active ? 'Ativo' : 'Inativo'}
      </span>
      <span className="text-[10px] text-slate-500 shrink-0">
        {format(new Date(broker.created_at), "dd/MM HH:mm")}
      </span>
    </div>

    {/* Row 2: Nome */}
    <h4 className="font-semibold text-white text-sm leading-snug line-clamp-1 mb-1 group-hover:text-primary transition-colors">
      {broker.name}
    </h4>

    {/* Row 3: Email */}
    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
      <Mail className="w-3 h-3 text-slate-500" />
      <span className="truncate">{broker.email}</span>
    </div>

    {/* Row 4: Barra de progresso */}
    <div className="mb-3">
      <div className="h-1 w-full bg-slate-700/50 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            broker.is_active ? "bg-primary" : "bg-red-500"
          )}
          style={{ width: `${getProgressPercentage(leadsCount)}%` }}
        />
      </div>
    </div>

    {/* Row 5: Projetos */}
    <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
      {broker.projects?.slice(0, 2).map(project => (
        <span key={project.id} className="px-2 py-0.5 text-[10px] rounded-md bg-[#2a2a2e] text-slate-300 border border-[#3a3a3e]">
          {project.name}
        </span>
      ))}
      {(broker.projects?.length || 0) > 2 && (
        <span className="px-2 py-0.5 text-[10px] rounded-md bg-[#2a2a2e] text-slate-400">
          +{broker.projects!.length - 2}
        </span>
      )}
    </div>

    {/* Row 6: Ações */}
    <div className="flex items-center gap-1 mb-3">
      <button onClick={(e) => { e.stopPropagation(); copyLink(broker.slug); }}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 min-h-[40px] md:min-h-0 md:py-1.5",
          "bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg",
          "font-medium text-xs transition-all"
        )}
      >
        {copiedSlug === broker.slug ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copiedSlug === broker.slug ? 'Copiado!' : 'Link'}</span>
      </button>
      
      <div className="flex-1" />
      
      <button onClick={(e) => { e.stopPropagation(); handleOpenDialog(broker); }}
        className="p-2 md:p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
      >
        <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
      </button>
      
      <button onClick={(e) => { e.stopPropagation(); deleteBroker(broker); }}
        className="p-2 md:p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
      </button>
    </div>

    {/* Row 7: Footer com métricas */}
    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
      <div className="flex items-center gap-2">
        <Avatar className="w-5 h-5 border border-[#2a2a2e]">
          <AvatarFallback className={cn("text-white text-[9px] font-medium bg-gradient-to-br", getAvatarGradient(broker.name))}>
            {broker.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Clock className="w-3 h-3" />
          <span>{lastAccess ? formatDistanceToNow(new Date(lastAccess), { addSuffix: false, locale: ptBR }) : '—'}</span>
        </div>
      </div>
      
      <span className="text-[10px] text-slate-400 font-medium">
        {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
      </span>
    </div>
  </div>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/BrokerManagement.tsx` | Refatorar cards para estilo Kanban |

---

## Imports Adicionais Necessários

```tsx
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Mail } from "lucide-react";
import { format } from "date-fns";
```

---

## Função Auxiliar para Progresso

```tsx
const getProgressPercentage = (leads: number): number => {
  if (leads === 0) return 5;
  if (leads <= 5) return 20;
  if (leads <= 10) return 40;
  if (leads <= 20) return 60;
  if (leads <= 50) return 80;
  return 100;
};
```

---

## Resultado Visual Esperado

- Cards com aparência idêntica ao Kanban
- Layout mais compacto (p-3 vs p-5)
- Hover com efeito de sombra profunda
- Barra de progresso visual para leads
- Footer com avatar pequeno e métricas
- Tags de status com estilo uppercase
- Ícones menores e mais refinados
- Totalmente clicável para abrir histórico
