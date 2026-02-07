

# Corrigir Flash de "Desconectado" na Conexao Global

## Problema

Ao abrir a aba "Conexao Global", o status aparece brevemente como "Desconectado" antes de exibir o status real "Conectado". Isso acontece porque o hook inicializa o status como `"disconnected"` e a condicao de loading no componente nunca ativa o spinner.

## Por que e Seguro

- O status padrao e puramente visual, exibido apenas nos ~200ms antes da resposta da API
- Assim que a API responde, o status real sobrescreve o padrao
- Se a instancia estiver desconectada, a API retorna `"disconnected"` e a UI se atualiza corretamente
- Nenhuma acao de envio ou gerenciamento depende do estado inicial

## Mudancas

### 1. `src/hooks/use-whatsapp-global-instance.ts` (linha 18)

Alterar o status padrao de `"disconnected"` para `"connected"`:

```
Antes: status: "disconnected"
Depois: status: "connected"
```

### 2. `src/components/whatsapp/GlobalConnectionTab.tsx` (linha 42)

Melhorar a condicao de loading para usar uma flag dedicada em vez de checar `!status` (que nunca sera falsy):

```
Antes: if (isLoading && !status)
Depois: if (isLoading)
```

Isso garante que durante o carregamento inicial, o usuario vera um spinner em vez de qualquer estado provisorio. Assim que o fetch completa, `isLoading` vira `false` e o status real e exibido.

## Resultado

- Nenhum flash de "Desconectado" ao abrir a aba
- Se a instancia estiver conectada: spinner -> Conectado (transicao limpa)
- Se a instancia estiver desconectada: spinner -> Desconectado (comportamento correto)
- Zero impacto no funcionamento de envio de mensagens, QR Code ou gerenciamento

