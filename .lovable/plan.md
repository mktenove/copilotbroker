

# Remover todas as pulsacoes rapidas restantes dentro do card

## Diagnostico

A configuracao da borda (`animate-ring-pulse` com 4s) esta correta. O problema e que **dentro do card** ainda existem elementos usando `animate-pulse` padrao do Tailwind (que pulsa a opacidade inteira do elemento a cada 2s):

1. **Linha 221** - O indicador de alerta "!" vermelho usa `animate-pulse`
2. **Linha 228** - O ponto verde da cadencia ativa usa `animate-pulse`

Esses dois elementos piscando rapidamente dentro do card dao a impressao de que o card todo ainda esta pulsando rapido.

## Solucao

Remover ou substituir o `animate-pulse` desses elementos internos por algo mais sutil e lento.

## Alteracoes

### KanbanCard.tsx

**Linha 221** - Indicador de alerta "!" (ponto vermelho):
- Remover `animate-pulse` — o ponto vermelho ja e visivel o suficiente sem animacao

**Linha 228** - Ponto verde da cadencia:
- Trocar `animate-pulse` por uma animacao mais lenta usando o mesmo timing de 4s
- Alternativa: usar uma classe customizada que pulsa a opacidade de forma lenta

### tailwind.config.ts

Adicionar um novo keyframe `dot-pulse` para o ponto verde, com duracao de 4s:

```text
"dot-pulse": {
  "0%, 100%": { opacity: "1" },
  "50%": { opacity: "0.3" },
}
```

E a animacao correspondente:

```text
"dot-pulse": "dot-pulse 4s ease-in-out infinite"
```

## Resumo das mudancas

| Arquivo | Linha | Mudanca |
|---------|-------|---------|
| tailwind.config.ts | keyframes + animation | Adicionar `dot-pulse` com 4s |
| KanbanCard.tsx | 221 | Remover `animate-pulse` do "!" vermelho |
| KanbanCard.tsx | 228 | Trocar `animate-pulse` por `animate-dot-pulse` |

