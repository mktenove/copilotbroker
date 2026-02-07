

# Cards Ultra-Minimalistas com Cores Corrigidas

## Problema

Os cards atuais usam as CSS variables `bg-card` e `border-border` que no dark mode resolvem para:
- `--card: 20 20% 8%` (HSL com matiz 20 = tom **marrom/quente**)
- `--border: 40 20% 20%` (HSL com matiz 40 = tom **marrom/dourado**)

Isso cria um contraste "quente" contra o fundo frio `#0f0f12`, gerando a sensacao de marrom que destoa do layout.

Alem disso, os cards ainda estao grandes demais com padding excessivo.

## Solucao

Trocar as CSS variables por cores fixas do design system frio e reduzir drasticamente o tamanho dos cards.

### Paleta correta (fria, sem marrom):
- Fundo de cards: `#1e1e22` (cinza neutro escuro)
- Bordas: `#2a2a2e` (cinza neutro medio)
- Background page: `#0f0f12` (ja esta correto)

### Arquivo: `src/pages/BrokerAdmin.tsx`

**Card "Seus Empreendimentos":**
- Trocar `bg-gradient-to-r from-card to-card/80` por `bg-[#1e1e22]`
- Trocar bordas baseadas em `border-border` por `border-[#2a2a2e]`
- Reduzir padding de `p-4` para `p-3`
- Reduzir `mb-6` para `mb-4`
- Trocar `rounded-xl` por `rounded-lg` para um visual mais sutil

**Cards de Stats ("Novos Leads" / "Total"):**
- Trocar `bg-card/80 backdrop-blur-sm` por `bg-[#1e1e22]/80`
- Trocar `border-border/50` por `border-[#2a2a2e]/50`
- Reduzir padding de `p-4 sm:p-6` para `p-3 sm:p-4`
- Reduzir numeros de `text-3xl sm:text-4xl` para `text-2xl sm:text-3xl`
- Reduzir gap e margin do grid: `gap-3 sm:gap-4 mb-6` para `gap-2 sm:gap-3 mb-4`
- Diminuir o separador dourado de `my-2 sm:my-3` para `my-1.5 sm:my-2`

### Resultado visual esperado

```
+----------------------------------------------------------+
| [icon] Empreendimentos  2 de 3 ativos             [->]   |
| [===========-----] barra 2px                              |
+----------------------------------------------------------+

+-------------------------+  +-------------------------+
| NOVOS LEADS             |  | TOTAL DE LEADS          |
| ____                    |  | ____                    |
| 5                       |  | 6                       |
+-------------------------+  +-------------------------+
```

Cards compactos, fundo cinza neutro `#1e1e22`, sem nenhum tom marrom.
