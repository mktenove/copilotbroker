

# Remover truncamento do detalhe de origem na Timeline

## Problema

O texto de detalhe da UTM (campanha, medium, etc.) no card de origem da timeline esta sendo cortado com `truncate`, impedindo a leitura completa.

## Alteracao

### Arquivo: `src/components/crm/LeadTimeline.tsx`

Na linha 214, remover a classe `truncate` do paragrafo de detalhe do card de origem:

**De:**
```
<p className="mt-1 ml-5.5 text-[11px] text-slate-500 truncate">
```

**Para:**
```
<p className="mt-1 ml-5.5 text-[11px] text-slate-500 break-words">
```

Isso permite que o texto quebre em multiplas linhas ao inves de ser cortado com reticencias.

