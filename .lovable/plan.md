

# Tornar a pulsacao da borda mais lenta

## Problema
A animacao atual dura 2 segundos por ciclo, o que ainda parece rapido. Vamos aumentar para **4 segundos** para criar um efeito de "respiracao" bem suave e lento.

## Alteracao

### tailwind.config.ts - Aumentar duracao para 4s

Na linha 175, alterar a duracao da animacao de `2s` para `4s`:

```text
"ring-pulse": "ring-pulse 4s ease-in-out infinite"
```

## Arquivo afetado

| Acao | Arquivo |
|------|---------|
| Editar | `tailwind.config.ts` (linha 175 - duracao 2s para 4s) |

Apenas uma linha precisa ser alterada. O keyframe continua o mesmo, so o tempo do ciclo completo aumenta de 2 para 4 segundos.

