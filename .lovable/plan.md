

# Corrigir Edge Function da Conexao Global

## Problema Raiz

A edge function `whatsapp-global-instance-manager` **nao esta deployada** no servidor. O teste direto retorna `404 - Requested function was not found`, o que causa todos os erros "Failed to fetch" e "Erro ao criar instancia" na interface.

## Evidencias

- Teste direto via curl: `{"code":"NOT_FOUND","message":"Requested function was not found"}`
- Zero logs de execucao no analytics (a funcao nunca rodou)
- Console do frontend mostra "Failed to fetch" a cada 15 segundos (polling)
- A tabela `global_whatsapp_config` tem um registro salvo mas com status "disconnected"

## Solucao

### Passo 1: Fazer deploy da edge function

Deployar a funcao `whatsapp-global-instance-manager` que ja existe no codigo mas nao esta no servidor.

### Passo 2: Testar a funcao apos deploy

Executar uma chamada GET no endpoint `/status` para verificar se a funcao responde corretamente e consegue se comunicar com a UAZAPI usando o token salvo no banco (`984cd567-f34b-4528-a5bf-7fb70dd4f869`).

### Passo 3: Verificar e corrigir possiveis erros no codigo

Se apos o deploy a funcao ainda apresentar erros, analisar os logs para identificar problemas como:
- URL da UAZAPI mal formada
- Token invalido
- Erros de importacao do Hono ou Supabase

## Resultado Esperado

- A funcao responde corretamente ao endpoint `/status`
- A interface "Conexao Global" para de mostrar "Erro ao criar instancia"
- O status da instancia reflete o estado real da conexao na UAZAPI

## Detalhes Tecnicos

O codigo da funcao usa o framework Hono com basePath `/whatsapp-global-instance-manager` e tem os seguintes endpoints:
- `GET /status` - Verifica status via token salvo no banco ou fallback para env vars
- `POST /init` - Cria nova instancia via admintoken
- `GET /qrcode` - Obtem QR code para conexao
- `POST /logout` - Desconecta a instancia
- `POST /restart` - Reinicia a instancia
- `POST /clear-session` - Limpa sessao e remove do banco

A configuracao em `supabase/config.toml` ja existe com `verify_jwt = false`.

