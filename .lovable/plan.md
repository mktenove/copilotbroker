

## Reorganizar informacoes no card do Kanban para evitar sobreposicao

### Problema atual
Na **Row 1** do card, os badges (projeto, roleta, fallback, stale) ficam no lado esquerdo usando `flex-wrap`, enquanto o badge de mensagem automatica ("1a msg" / "Manual") e a data ficam no lado direito com `shrink-0`. Quando ha muitos badges a esquerda (ex: projeto + roleta + stale), eles competem pelo espaco horizontal com o badge de mensagem e a data, causando sobreposicao visual ou compressao excessiva.

### Solucao proposta
Redistribuir as informacoes em linhas separadas para que nada se sobreponha, mantendo o card compacto:

**Nova estrutura do card:**

1. **Linha 1 (topo):** Projeto + Data/Hora (lado a lado, como hoje, mas sem os outros badges)
2. **Linha 2 (badges contextuais):** Roleta, Fallback, 1a Msg, Stale -- todos na mesma linha horizontal com `flex-wrap`, sem competir com a data
3. **Linha 3:** Nome do lead (sem mudanca)
4. **Linha 4:** Contato (telefone/email, sem mudanca)
5. **Linha 5:** Barra de progresso (sem mudanca)
6. **Linha 6:** Botao WhatsApp + acoes (sem mudanca)
7. **Linha 7 (rodape):** Avatar do corretor + tempo + origem (sem mudanca)

### Detalhes tecnicos

**Arquivo:** `src/components/crm/KanbanCard.tsx`

- Separar a Row 1 atual em duas partes:
  - A primeira mantem apenas o badge do projeto e a data/hora nos cantos
  - Uma nova linha abaixo agrupa os badges contextuais (Roleta, Fallback, 1a msg enviada, Manual, indicador Stale) em um `flex flex-wrap gap-1` sem restricao de espaco
- Os badges contextuais so aparecem condicionalmente, entao a linha extra so ocupa espaco quando ha algo a mostrar (condicional com `&&`)
- Nenhuma outra alteracao em logica, dados ou estilos dos badges individuais

