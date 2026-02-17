

# Fila de Envio - Layout Minimalista com Preview de Mensagem

## Objetivo

Transformar os cards da fila de envio em linhas compactas (single-line) que mostram o inicio da mensagem, com expand/collapse ao clicar para ver a mensagem completa e as acoes (cancelar/retry).

## Alteracoes

### Arquivo: `src/components/whatsapp/QueueTab.tsx`

#### PendingMessageCard - De card multi-linha para linha compacta

Layout atual (3 blocos verticais com padding generoso):
```
[Lead Name]                    [Badge]
[Campaign]                     [HH:mm]
─────────────────────────────────────
                          [Cancelar]
```

Novo layout (linha unica, clicavel para expandir):
```
[HH:mm] [Lead Name] · "Ola, tudo bem? Go..."  [Badge]
```

Ao clicar, expande para mostrar:
```
[HH:mm] [Lead Name] · "Ola, tudo bem? Go..."  [Badge]
  Mensagem completa aqui com quebra de linha...
  [Campanha: Nome]                    [Cancelar]
```

#### HistoryMessageCard - Mesmo tratamento

Layout compacto (linha unica):
```
[icon] [Lead Name] · "Ola, tudo bem?..."  [HH:mm] [Badge]
```

Ao clicar, expande para mostrar mensagem completa e botao de retry (se falhou).

#### Implementacao tecnica

1. Adicionar `useState` local em cada card para controlar `expanded` (true/false)
2. Reduzir padding de `p-3` para `px-3 py-2`
3. Colocar tudo em uma unica linha (flex row) no estado colapsado
4. Truncar `message.message` nos primeiros ~40 caracteres com `...`
5. Ao clicar no card (cursor-pointer), toggle expanded
6. No estado expandido, mostrar mensagem completa + acoes abaixo
7. Reduzir espaco entre cards de `space-y-2` para `space-y-1`

#### Estrutura do card colapsado (Pending)

```text
px-3 py-2 | flex items-center gap-2
  [HH:mm texto slate-500]
  [Lead name truncate]
  [message preview slate-400 italic truncate]
  [Badge]
```

#### Estrutura expandida (Pending)

```text
px-3 py-2 | coluna
  linha principal (mesma do colapsado)
  div mt-2 pt-2 border-t
    p texto completo da mensagem
    flex justify-between
      span campanha
      botao cancelar
```

#### Estrutura do card colapsado (History)

```text
px-3 py-2 | flex items-center gap-2
  [icon 4x4]
  [Lead name truncate]
  [message preview slate-400 italic truncate]
  [HH:mm]
  [Badge]
```

#### Estrutura expandida (History)

```text
px-3 py-2 | coluna
  linha principal
  div mt-2 pt-2 border-t
    p texto completo / erro
    botao retry (se falhou)
```

### Reducoes visuais

- Icons de 5x5 para 4x4 nos history cards
- Fonte do preview da mensagem: `text-xs text-slate-500 italic`
- Espacamento entre cards: `space-y-1`
- Sem `CardContent` wrapper nos stats (manter como esta)

