

# Simplificar Tipos de Parcela e Unificar Campos

## Alteracoes

### 1. Atualizar tipos de parcela no PropostaModal

Substituir a lista atual de 9 tipos por 6 tipos conforme solicitado:

- `entrada` -> "Entrada"
- `parcelamento` -> "Parcelamento"
- `reforco` -> "Reforco"
- `balao` -> "Balao"
- `dacao` -> "Dacao"
- `financiamento_bancario` -> "Financiamento Bancario"

### 2. Unificar campos Descricao e Observacao em um so

Cada parcela tera apenas um campo "Observacao" (ao inves de dois campos separados). O placeholder sera mais generico, como "Ex: Terreno em Estancia Velha, 6 reforcos semestrais..."

### Arquivos modificados

1. **`src/components/crm/PropostaModal.tsx`**
   - Alterar constante `TIPOS_PARCELA` para os 6 novos tipos
   - Remover campo `descricao` da interface `ParcelaForm` e do formulario
   - Manter apenas o campo `observacao` (renomeado visualmente para "Observacao")
   - Atualizar `emptyParcela()` removendo `descricao`
   - Atualizar `handleConfirm` para mapear `observacao` para o campo `descricao` no banco (ja que o banco tem ambos os campos)

2. **`src/components/crm/PropostasList.tsx`**
   - Atualizar labels dos tipos para os novos nomes
   - Exibir observacao como campo unico

3. **`src/components/crm/PropostaPDF.tsx`**
   - Atualizar labels dos tipos para os novos nomes
   - Unificar exibicao de descricao/observacao em uma coluna so

4. **`src/hooks/use-propostas.ts`**
   - Atualizar deteccao de permuta para usar o novo valor `dacao` ao inves de `dacao_pagamento`

Nenhuma alteracao de banco de dados e necessaria -- os campos `descricao` e `observacao` continuam existindo na tabela `proposta_parcelas`, simplesmente o modal passara a usar apenas um deles.
