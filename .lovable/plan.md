
# Proposta aparece imediatamente apos ser criada

## Problema
Ao criar uma proposta, o sistema depende exclusivamente da subscricao Realtime do banco de dados para atualizar a lista. Isso pode causar um atraso perceptivel (1-3 segundos) antes da proposta aparecer na tela.

## Solucao
Adicionar uma chamada direta ao `fetchPropostas()` dentro da funcao `criarProposta` logo apos o insert ser concluido com sucesso. Isso garante que a lista seja atualizada imediatamente, sem depender do Realtime.

## Alteracao

**Arquivo:** `src/hooks/use-propostas.ts`

Na funcao `criarProposta`, adicionar `await fetchPropostas()` logo antes do `toast.success()` (apos todas as insercoes no banco). Tambem atualizar a dependencia do `useCallback` para incluir `fetchPropostas`.

A mesma logica ja existe no Realtime (que continuara funcionando como backup para atualizacoes vindas de outros usuarios), mas o refetch direto garante que o proprio usuario veja o resultado instantaneamente.
