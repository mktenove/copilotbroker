
# Warmup - Mensagem Discreta

## O que sera feito

Substituir o Card amarelo chamativo do "Periodo de Aquecimento" por uma linha simples e discreta, sem fundo colorido, apenas um texto sutil com icone pequeno inline -- seguindo a estetica minimalista do projeto.

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/ConnectionTab.tsx` | Substituir o bloco Card/CardContent (linhas 235-253) por um div simples com texto em slate |

## Detalhes tecnicos

Remover o `Card` com gradiente amarelo e substituir por:

```text
<div className="flex items-center gap-2 text-sm text-slate-500 px-1">
  <span>🔥</span>
  <span>Aquecimento dia {instance.warmup_day}/14</span>
  <span className="text-slate-600">·</span>
  <span>{instance.daily_limit} msgs/dia · {instance.hourly_limit} msgs/hora</span>
</div>
```

Resultado: uma linha discreta em cinza claro, sem card, sem fundo amarelo, sem bordas. Apenas informacao sutil.
