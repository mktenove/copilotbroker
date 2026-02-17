

# Corrigir animacao de leads novos e cadencia ativa

## Diagnostico

Ha dois locais no KanbanCard que aplicam animacoes verdes:

1. **Linha 166 - Lead Novo** (`isNew`): Usa `animate-pulse` padrao do Tailwind, que anima a **opacidade do card inteiro** a cada 2s. Esse e o que voce esta vendo piscar rapido.
2. **Linha 167 - Cadencia Ativa** (`hasCadenciaAtiva && !isNew`): Usa nosso `animate-ring-pulse` customizado com 4s. Esse so e aplicado quando o lead NAO e novo.

Como o lead provavelmente esta na coluna "Pre Atendimento" (status `new`), ele entra no caso 1 e ignora o caso 2.

## Solucao

Aplicar a mesma tecnica de animacao por `box-shadow` para o lead novo tambem, usando duracao de 4s.

### Alteracao no KanbanCard.tsx

Substituir a linha 166:

De:
```text
isNew && "ring-2 ring-emerald-400/60 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.3)]"
```

Para:
```text
isNew && "animate-ring-pulse shadow-[0_0_20px_rgba(52,211,153,0.3)]"
```

Isso faz o lead novo usar a mesma animacao lenta de borda (4s), mantendo o glow verde sutil por baixo.

### Nenhuma alteracao no tailwind.config.ts

O keyframe `ring-pulse` ja esta configurado corretamente com 4s.

## Arquivo afetado

| Acao | Arquivo |
|------|---------|
| Editar | `src/components/crm/KanbanCard.tsx` (linha 166) |

