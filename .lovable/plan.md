

# Corrigir URL de Envio do WhatsApp Message Sender

## Problema

O `whatsapp-message-sender` esta construindo URLs invalidas para enviar mensagens de corretores:

```text
URL atual:  https://enove_kely_monique.uazapi.com/send/text  --> 404 (dominio nao existe)
URL correta: https://enove.uazapi.com/send/text               --> 200 (usando token no header)
```

A logica atual (linhas 83-87) tenta criar um subdominio com o nome da instancia:
```text
if (instanceName && !UAZAPI_BASE_URL.includes(instanceName)) {
    baseUrl = `https://${instanceName}.uazapi.com`;  // ERRADO
}
```

A funcao `notify-new-lead` funciona corretamente porque extrai apenas a origin da URL base e usa o token no header para identificar a instancia.

## Causa Raiz

A UAZAPI v2 identifica instancias pelo header `token`, nao por subdominio. Todas as requisicoes devem ir para a mesma URL base (ex: `https://enove.uazapi.com/send/text`), diferenciando-se apenas pelo token de cada corretor.

## Correcao

### Atualizar `sendMessageViaUAZAPI` no `whatsapp-message-sender/index.ts`

Remover a logica de subdominio e usar a mesma abordagem do `notify-new-lead`:

1. Extrair a origin da `UAZAPI_INSTANCE_URL` (ex: `https://enove.uazapi.com`)
2. Sempre usar essa URL base para todos os corretores
3. Diferenciar instancias apenas pelo header `token` (que ja e passado corretamente via `instanceToken`)

```text
ANTES:
  baseUrl = UAZAPI_BASE_URL
  if (instanceName nao esta na URL) --> baseUrl = https://{instanceName}.uazapi.com  (ERRADO)

DEPOIS:
  Extrair origin de UAZAPI_BASE_URL --> https://enove.uazapi.com
  Usar sempre essa URL base
  Token no header diferencia as instancias
```

## Arquivo a Alterar

- `supabase/functions/whatsapp-message-sender/index.ts` - Corrigir a funcao `sendMessageViaUAZAPI` (linhas 78-91)

## Resultado Esperado

1. Mensagens de corretores serao enviadas para `https://enove.uazapi.com/send/text` com o token individual
2. A mensagem do lead "Teste Maicon" (e qualquer outra presa na fila) sera processada com sucesso
3. O historico do lead mostrara o resultado (sucesso ou erro real da API, nao mais 404)

