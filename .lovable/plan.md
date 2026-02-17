

# Remover "Saiba como funciona"

## O que sera feito

Remover o bloco Collapsible "Saiba como funciona" da aba "1a Mensagem" no componente `AutoMessageTab.tsx`, incluindo os dois Alerts informativos dentro dele. Tambem remover os imports que ficarao sem uso (`Info`, `XCircle`, `ChevronDown`, `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `Alert`, `AlertDescription`) e o estado `infoOpen` com seu `useEffect`.

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/AutoMessageTab.tsx` | Remover bloco Collapsible, imports e estado relacionados |

## Detalhes tecnicos

- Remover imports: `Info`, `XCircle`, `ChevronDown` do lucide-react; `Alert`, `AlertDescription` do ui/alert; `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` do ui/collapsible
- Remover estado `infoOpen` e o `useEffect` que o controla
- Remover todo o bloco `<Collapsible>...</Collapsible>` (linhas 147-165 aproximadamente)
- Import de `useIsMobile` tambem pode ser removido se nao for usado em outro lugar do componente

