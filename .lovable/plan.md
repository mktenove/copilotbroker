

# Corrigir pulsacao rapida do card no Kanban (causa raiz)

## Diagnostico

Existem **dois problemas** causando a pulsacao rapida:

### Problema 1: `transition-all` conflita com a animacao

Na linha 162 do KanbanCard.tsx, o card tem `transition-all duration-200 ease-out`. Isso aplica transicao CSS a **todas as propriedades**, incluindo `box-shadow`. Mas a animacao `ring-pulse` tambem muda `box-shadow`. O navegador tenta aplicar os dois ao mesmo tempo (transicao de 200ms + animacao de 4s), criando um efeito visual estranho e rapido.

### Problema 2: Re-renders reiniciam a animacao

O Kanban recebe atualizacoes em tempo real do banco de dados. Cada atualizacao causa um re-render do componente, e cada re-render **reinicia** a animacao CSS do zero. Se as atualizacoes vem a cada ~300ms, a animacao nunca completa um ciclo e fica "piscando" ao reiniciar repetidamente.

## Solucao

### 1. KanbanCard.tsx - Trocar `transition-all` por transicoes especificas

Na linha 162, substituir:

```text
"transition-all duration-200 ease-out"
```

Por:

```text
"transition-colors duration-200 ease-out transition-[border-color,transform,opacity]"
```

Isso faz a transicao funcionar apenas para cores de borda, transform e opacidade - **sem interferir** no `box-shadow` que a animacao controla.

### 2. KanbanCard.tsx - Mover animacao para CSS inline com `animationName` 

Para evitar que re-renders reiniciem a animacao, vamos usar `style` em vez de className para a animacao. Animacoes aplicadas via `style` nao reiniciam quando o componente re-renderiza se a referencia do estilo for estavel.

Alternativa mais simples: usar `will-change: box-shadow` no elemento para que o navegador otimize a animacao e nao a reinicie em re-renders.

## Alteracoes

### Arquivo: src/components/crm/KanbanCard.tsx

**Linha 162** - Substituir `transition-all` por transicoes especificas que excluem `box-shadow`:

De:
```text
"transition-all duration-200 ease-out",
```

Para:
```text
"transition-[border-color,transform,opacity] duration-200 ease-out",
```

**Linhas 166-167** - Adicionar `will-change-[box-shadow]` para estabilizar a animacao:

De:
```text
isNew && "animate-ring-pulse shadow-[0_0_20px_rgba(52,211,153,0.3)]",
hasCadenciaAtiva && !isNew && "animate-ring-pulse"
```

Para:
```text
isNew && "animate-ring-pulse shadow-[0_0_20px_rgba(52,211,153,0.3)] will-change-[box-shadow]",
hasCadenciaAtiva && !isNew && "animate-ring-pulse will-change-[box-shadow]"
```

### Nenhuma alteracao no tailwind.config.ts

O keyframe e a duracao de 4s estao corretos.

## Resumo

| Arquivo | Linha | Mudanca |
|---------|-------|---------|
| KanbanCard.tsx | 162 | `transition-all` para `transition-[border-color,transform,opacity]` |
| KanbanCard.tsx | 166 | Adicionar `will-change-[box-shadow]` |
| KanbanCard.tsx | 167 | Adicionar `will-change-[box-shadow]` |

