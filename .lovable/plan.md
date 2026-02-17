

# Verificacao de Conflito ao Selecionar Empreendimento

## Objetivo

Mover a verificacao de conflito entre "1a Mensagem" e "Cadencia 10D" para o momento em que o usuario seleciona o empreendimento no dropdown, em vez de verificar apenas ao clicar em "Criar Regra".

## Alteracoes

### 1. `AutoCadenciaRuleEditor.tsx`

- Adicionar estado `hasFirstMessageConflict` (boolean) e `checkingConflict` (boolean)
- No `onValueChange` do Select de empreendimento, alem de chamar `setProjectId`, disparar uma query assincrona em `broker_auto_message_rules` para verificar se existe regra ativa de 1a Mensagem para o mesmo empreendimento (ou global)
- Exibir mensagem de erro abaixo do Select quando houver conflito: "Ja existe uma 1a Mensagem ativa para este empreendimento. Desative-a primeiro."
- Desabilitar o botao "Criar Regra" quando `hasFirstMessageConflict` for true
- Mostrar um spinner pequeno enquanto a verificacao esta em andamento

### 2. `AutoMessageRuleEditor.tsx`

- Mesma logica, porem verificando `broker_auto_cadencia_rules`
- Adicionar estado `hasCadenciaConflict` e `checkingConflict`
- No `onValueChange` do Select, verificar se existe regra ativa de Cadencia 10D para o empreendimento selecionado
- Exibir mensagem de erro e desabilitar botao quando houver conflito

### Detalhes Tecnicos

A query de verificacao em cada editor sera:

```text
// No AutoCadenciaRuleEditor (verifica 1a Mensagem)
const query = supabase
  .from("broker_auto_message_rules")
  .select("id")
  .eq("broker_id", brokerId)
  .eq("is_active", true);

if (projectId !== "all") {
  query.or(`project_id.eq.${projectId},project_id.is.null`);
} else {
  query.is("project_id", null);
}

// No AutoMessageRuleEditor (verifica Cadencia 10D)
// Mesma logica, mas em broker_auto_cadencia_rules
```

A verificacao tambem sera executada no `useEffect` que reseta o formulario (quando `editingRule` ou `isOpen` muda), para que o estado inicial ja reflita corretamente.

Os hooks (`use-auto-cadencia-rules.ts` e `use-auto-message-rules.ts`) manterao a verificacao no `createRule` e `toggleRuleActive` como fallback de seguranca no backend, mas o feedback principal sera dado ao usuario imediatamente no frontend.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/AutoCadenciaRuleEditor.tsx` | Adicionar verificacao assincrona ao selecionar empreendimento |
| `src/components/whatsapp/AutoMessageRuleEditor.tsx` | Adicionar verificacao assincrona ao selecionar empreendimento |

