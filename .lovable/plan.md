
# Plano: Melhorar Visibilidade de Empreendimentos Pendentes para Corretores

## Objetivo

Mostrar claramente quantos empreendimentos o corretor possui versus o total disponível, incentivando-o a adicionar os que faltam.

## Mudanças Propostas

### 1. Atualizar o Card de Empreendimentos no Dashboard (`BrokerAdmin.tsx`)

O card compacto será aprimorado para mostrar:
- Indicador visual tipo "2/3 empreendimentos"
- Barra de progresso sutil
- Badge de alerta quando há empreendimentos pendentes

**Layout proposto:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🏢 Seus Empreendimentos                                    →    │
│                                                                 │
│ [████████░░░░] 2 de 3 empreendimentos                           │
│                                                                 │
│ ⚠️ Você ainda não adicionou 1 empreendimento                   │
└─────────────────────────────────────────────────────────────────┘
```

**Variações de estado:**
- **Todos adicionados (3/3):** Card verde, sem alerta
- **Parcial (2/3):** Card com alerta laranja e mensagem incentivadora
- **Nenhum (0/3):** Card com destaque vermelho e CTA forte

### 2. Atualizar o Hook `useBrokerProjects`

Expor uma propriedade adicional `totalProjects` para facilitar o cálculo no componente:

```typescript
return {
  // ... existing properties
  totalProjects: availableProjects.length,
  pendingCount: unassociatedProjects.length,
};
```

### 3. Melhorar a Página de Gerenciamento (`BrokerProjects.tsx`)

Adicionar seção destacada no topo quando houver empreendimentos pendentes:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📢 Novos empreendimentos disponíveis!                           │
│                                                                 │
│ Você pode adicionar mais 1 empreendimento à sua carteira        │
│                                                                 │
│                                       [+ Adicionar agora]       │
└─────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/hooks/use-broker-projects.ts` | Modificar | Expor `totalProjects` e `pendingCount` |
| `src/pages/BrokerAdmin.tsx` | Modificar | Card com progresso e alerta de pendentes |
| `src/pages/BrokerProjects.tsx` | Modificar | Banner de destaque para pendentes |

## Detalhes da Implementação

### Card do Dashboard (BrokerAdmin.tsx)

```tsx
{/* Compact Projects Summary Card */}
{broker && (
  <div 
    onClick={() => navigate("/corretor/empreendimentos")}
    className={cn(
      "bg-card border rounded-xl p-4 mb-6 cursor-pointer transition-colors group",
      pendingCount > 0 
        ? "border-amber-500/50 hover:border-amber-500" 
        : "border-border hover:border-primary/50"
    )}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          pendingCount > 0 ? "bg-amber-500/10" : "bg-primary/10"
        )}>
          <Building2 className={cn(
            "w-5 h-5",
            pendingCount > 0 ? "text-amber-500" : "text-primary"
          )} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Seus Empreendimentos</p>
          <p className="text-xs text-muted-foreground">
            {brokerProjects.length} de {totalProjects} ativos
          </p>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>

    {/* Progress Bar */}
    <Progress 
      value={(brokerProjects.length / totalProjects) * 100} 
      className="h-1.5 mb-2"
    />

    {/* Pending Alert */}
    {pendingCount > 0 && (
      <div className="flex items-center gap-2 text-amber-500 text-xs">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>
          {pendingCount === 1 
            ? "1 empreendimento disponível para adicionar" 
            : `${pendingCount} empreendimentos disponíveis para adicionar`}
        </span>
      </div>
    )}
  </div>
)}
```

### Textos por Estado

| Cenário | Texto Principal | Alerta |
|---------|----------------|--------|
| 0/3 | "0 de 3 ativos" | "3 empreendimentos disponíveis para adicionar" |
| 2/3 | "2 de 3 ativos" | "1 empreendimento disponível para adicionar" |
| 3/3 | "3 de 3 ativos" | (sem alerta, card em estado normal) |

## Resultado Esperado

1. **Corretor vê claramente** quantos empreendimentos tem vs. total
2. **Incentivo visual** com barra de progresso e alerta
3. **Call-to-action sutil** que direciona para página de gerenciamento
4. **Experiência gamificada** - corretor quer "completar" a barra
