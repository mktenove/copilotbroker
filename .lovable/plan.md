

# Corrigir Atualização da Lista Após Criar Regra

## Problema

O `AutoMessageTab` e o `AutoMessageRuleEditor` chamam `useAutoMessageRules()` cada um separadamente. Isso cria dois estados independentes:

```text
AutoMessageTab
  └── useAutoMessageRules()  --> rules (estado A)
  └── AutoMessageRuleEditor
        └── useAutoMessageRules()  --> rules (estado B)
```

Quando o editor chama `createRule()`, atualiza o estado B, mas o estado A (que renderiza a lista) permanece inalterado.

## Solucao

Remover a chamada duplicada do hook no `AutoMessageRuleEditor` e passar as funcoes necessarias (`createRule`, `updateRule`, `isSaving`, `rules`) como props vindas do `AutoMessageTab`, que ja possui a instancia correta do hook.

```text
AutoMessageTab
  └── useAutoMessageRules()  --> rules (estado unico)
  └── AutoMessageRuleEditor
        └── recebe createRule, updateRule, isSaving, rules via props
```

## Alteracoes

### 1. Atualizar `AutoMessageRuleEditor.tsx`

- Remover o import e a chamada de `useAutoMessageRules()`
- Adicionar `createRule`, `updateRule`, `isSaving` e `rules` na interface de props
- Usar essas props no lugar do hook interno

### 2. Atualizar `AutoMessageTab.tsx`

- Passar `createRule`, `updateRule`, `isSaving` e `rules` como props para o `AutoMessageRuleEditor`
- A tab ja desestrutura `rules` do hook, entao basta tambem desestruturar `createRule`, `updateRule` e `isSaving`

## Resultado Esperado

- Ao criar uma regra, a lista atualiza imediatamente porque ambos os componentes compartilham o mesmo estado
- O mesmo vale para editar regras: as alteracoes refletem instantaneamente na lista
- A verificacao de "projeto ja tem regra" tambem funciona corretamente, pois usa a mesma lista

