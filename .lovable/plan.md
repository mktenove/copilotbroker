

# Corrigir animacao da cadencia: apenas borda pisca, duracao 2s

## Problema atual

A classe `animate-[pulse_1s_ease-in-out_infinite]` usa o keyframe `pulse` padrao do Tailwind, que anima a **opacidade do card inteiro** (de 1 para 0.5 e volta). Isso faz o conteudo todo piscar junto.

## Solucao

Criar um keyframe customizado `ring-pulse` que anima apenas o `box-shadow` (que e como o Tailwind implementa o `ring`). Assim, so a borda verde pulsa, o conteudo do card permanece estavel.

## Alteracoes

### 1. tailwind.config.ts - Novo keyframe + animation

Adicionar em `keyframes`:

```text
"ring-pulse": {
  "0%, 100%": { boxShadow: "0 0 0 2px rgba(52, 211, 153, 0.6)" },
  "50%": { boxShadow: "0 0 0 2px rgba(52, 211, 153, 0.15)" },
}
```

Adicionar em `animation`:

```text
"ring-pulse": "ring-pulse 2s ease-in-out infinite"
```

### 2. KanbanCard.tsx - Trocar classe de animacao

Substituir:
```text
hasCadenciaAtiva && !isNew && "ring-2 ring-emerald-400/60 animate-[pulse_1s_ease-in-out_infinite]"
```

Por:
```text
hasCadenciaAtiva && !isNew && "animate-ring-pulse"
```

O `ring-2` e `ring-emerald-400/60` sao removidos porque o `box-shadow` do keyframe ja define a borda diretamente.

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Editar | `tailwind.config.ts` (keyframe + animation) |
| Editar | `src/components/crm/KanbanCard.tsx` (trocar classe) |

## Detalhes tecnicos

- O `box-shadow` com spread de `2px` reproduz o mesmo visual do `ring-2`
- A cor `rgba(52, 211, 153, 0.6)` equivale a `emerald-400/60`
- No ponto minimo da pulsacao, a opacidade cai para `0.15` criando um efeito de "respiracao" sutil
- Duracao de 2 segundos por ciclo conforme solicitado
