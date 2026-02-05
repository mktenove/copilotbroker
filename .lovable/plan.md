
# Correção: QR Code para Instância Global WhatsApp

## Diagnóstico do Problema

Ao analisar os logs e o código, identifiquei as seguintes causas:

1. **Erro 401 "Invalid token"**: Todas as chamadas para UAZAPI estao retornando 401, indicando que o token configurado esta invalido ou expirado

2. **Instância foi excluída**: Voce deletou todas as instancias no painel UAZAPI, entao a instancia global nao existe mais

3. **Arquitetura incompleta**: A edge function `whatsapp-global-instance-manager` tenta usar endpoints como `/instance/connect` e `/instance/status` que pressupõem que a instancia JA EXISTE. Porem, apos a exclusao, e necessario CRIAR a instancia primeiro

4. **Falta de endpoint de inicializacao**: Diferentemente do `whatsapp-instance-manager` (para corretores), que possui um endpoint `/init` completo, a versao global nao tem essa capacidade

---

## Solucao Proposta

### Fluxo Corrigido

```text
+------------------+     +-------------------+     +------------------+
|   Usuario clica  | --> | Verificar se      | --> | Instancia existe?|
|  "Gerar QR Code" |     | instancia existe  |     +--------+---------+
+------------------+     +-------------------+              |
                                                   SIM      |      NAO
                                              +-------------+-------------+
                                              |                           |
                                              v                           v
                                    +------------------+     +------------------------+
                                    | POST /instance/  |     | POST /instance/init    |
                                    | connect          |     | (criar instancia nova) |
                                    +--------+---------+     +------------+-----------+
                                             |                            |
                                             +------------+---------------+
                                                          |
                                                          v
                                               +---------------------+
                                               | Retornar QR Code    |
                                               | para o frontend     |
                                               +---------------------+
```

---

## Alteracoes Tecnicas

### 1. Edge Function (`whatsapp-global-instance-manager`)

**Arquivo**: `supabase/functions/whatsapp-global-instance-manager/index.ts`

**Mudancas**:

a) **Adicionar suporte ao UAZAPI_ADMIN_TOKEN**: Para criar instancias, a UAZAPI exige o token administrativo, nao o token da instancia

b) **Novo endpoint POST `/init`**: Criar uma nova instancia via UAZAPI usando `POST /instance/init` com admintoken

c) **Endpoint `/qrcode` inteligente**: 
   - Primeiro tenta conectar a instancia existente
   - Se falhar com 401/404, automaticamente cria uma nova instancia via `/init`
   - Retorna o QR code apos criar/conectar

d) **Fallback de autenticacao**: Similar ao `whatsapp-instance-manager`, tentar diferentes estilos de header (admintoken, token)

### 2. Hook React (`use-whatsapp-global-instance`)

**Arquivo**: `src/hooks/use-whatsapp-global-instance.ts`

**Mudancas**:

- Adicionar novo metodo `initInstance()` para criar instancia manualmente
- Melhorar `fetchQRCode()` para mostrar mensagens de erro mais claras

### 3. Interface (`GlobalConnectionTab`)

**Arquivo**: `src/components/whatsapp/GlobalConnectionTab.tsx`

**Mudancas**:

- Adicionar botao "Criar Nova Instância" visível quando status = desconectado e houver erro de autenticacao
- Melhorar feedback visual durante processo de criacao

---

## Pre-requisitos - Verificar Tokens

**IMPORTANTE**: Antes da implementacao funcionar, voce precisa confirmar que os secrets estao corretos:

| Secret | Descricao | Como obter |
|--------|-----------|------------|
| `UAZAPI_ADMIN_TOKEN` | Token administrativo do painel UAZAPI | Painel admin UAZAPI -> Configuracoes -> Token Admin |
| `UAZAPI_INSTANCE_URL` | URL base da UAZAPI (ex: `https://enove.uazapi.com`) | Seu painel UAZAPI |
| `UAZAPI_TOKEN` | Token da instancia (sera gerado ao criar) | Retornado apos criar instancia |

---

## Arquivos a Modificar

| Arquivo | Alteracao Principal |
|---------|---------------------|
| `supabase/functions/whatsapp-global-instance-manager/index.ts` | Adicionar `/init` endpoint e autenticacao com admintoken |
| `src/hooks/use-whatsapp-global-instance.ts` | Adicionar `initInstance()` |
| `src/components/whatsapp/GlobalConnectionTab.tsx` | Botao "Criar Instância" e melhor UX |

---

## Resultado Esperado

Apos as alteracoes:

1. Voce podera clicar em "Criar Nova Instância" no painel
2. O sistema criara uma nova instancia na UAZAPI usando o admintoken
3. O QR Code sera exibido automaticamente para voce escanear
4. Apos escanear, a instancia ficara conectada e pronta para notificacoes
