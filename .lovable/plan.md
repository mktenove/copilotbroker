

# Corrigir Erro 405 "Method Not Allowed" no Envio de Notificacoes

## Problema Identificado

A URL de envio esta sendo montada incorretamente. O formato atual e:

```text
https://enove.uazapi.com/enove_global_1770423387245/send/text  (ERRADO - 405)
```

Mas o formato correto da UAZAPI v2 e:

```text
https://enove.uazapi.com/send/text  (CORRETO)
```

Na UAZAPI v2, a instancia e identificada pelo header `token`, nao pela URL. As outras funcoes (`whatsapp-global-instance-manager` e `whatsapp-message-sender`) ja usam esse formato corretamente.

## Evidencias

- Logs mostram: `url: "https://enove.uazapi.com/enove_global_1770423387245/send/text"` retornando 405
- O `whatsapp-global-instance-manager` faz requests para `https://enove.uazapi.com/instance/status` (sem nome da instancia no path)
- O `whatsapp-message-sender` usa `${baseUrl}/send/text` onde baseUrl e o dominio base
- A linha 74 do `notify-new-lead` esta errada: `instanceUrl = ${baseApiUrl}/${storedInstance.instance_name}`

## Problema Secundario

O status no banco de dados (`global_whatsapp_config`) permanece como "disconnected" mesmo quando a instancia esta conectada. Isso ocorre porque o `whatsapp-global-instance-manager` detecta o status "connected" da UAZAPI mas nao atualiza o banco.

## Alteracoes

### 1. Corrigir URL em `notify-new-lead/index.ts`

Mudar a linha 74 de:

```typescript
// ERRADO: inclui nome da instância no path
instanceUrl = `${baseApiUrl}/${storedInstance.instance_name}`;
```

Para:

```typescript
// CORRETO: usa apenas o domínio base, token identifica a instância
instanceUrl = baseApiUrl;
```

O token ja esta sendo passado corretamente no header, entao a UAZAPI sabe qual instancia usar.

### 2. Atualizar status no banco apos verificacao de status

No `whatsapp-global-instance-manager`, garantir que o endpoint `/status` atualize o campo `status` na tabela `global_whatsapp_config` quando detectar que a instancia esta conectada na UAZAPI. Isso corrige o problema do status "disconnected" persistente.

## Resultado Esperado

- URL de envio sera `https://enove.uazapi.com/send/text` (formato correto UAZAPI v2)
- Token no header `token` identifica a instancia
- Notificacoes serao enviadas com sucesso
- Status no banco refletira o estado real da instancia ("connected")

## Detalhes Tecnicos

A funcao `notify-new-lead` precisa apenas de 2 informacoes do banco:
1. `instance_token` - para autenticacao via header
2. A URL base (`https://enove.uazapi.com`) - extraida da variavel de ambiente

O `instance_name` nao e necessario para construir a URL de envio - ele e usado apenas para operacoes administrativas (init, connect, disconnect).

