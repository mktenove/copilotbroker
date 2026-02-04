

# Plano: Corrigir Endpoints de Conexão UAZAPI

## Resumo do Problema

As instâncias estão sendo criadas com sucesso na UAZAPI (você confirmou 2 instâncias no painel), porém os endpoints de QR Code e status retornam 404 porque:

1. O nome da instância salvo localmente pode não corresponder ao identificador usado pela UAZAPI
2. O endpoint `/instance/connect` precisa do token específico da instância
3. O formato da URL pode estar incorreto

---

## Alterações Planejadas

### 1. Melhorar Captura de Dados na Criação (`/init`)

Na resposta do `/instance/init`, a UAZAPI retorna o objeto completo da instância. Precisamos capturar:
- `id` - Identificador único interno
- `name` - Nome da instância (pode ser diferente do que enviamos)
- `token` - Token de autenticação da instância

```text
Antes: Salvávamos apenas o token
Depois: Salvamos id, name real e token da resposta
```

### 2. Corrigir Endpoint de QR Code

De acordo com a documentação UAZAPI V2:

| Antes | Depois |
|-------|--------|
| `GET /instance/connect/{name}` | `POST /instance/connect` (com token no header) |
| Múltiplas tentativas de endpoint | Endpoint único + token correto |

O endpoint `/instance/connect` deve usar o **token da instância** (não o admintoken) no header.

### 3. Adicionar Sincronização de Nome

Quando a instância já existe no banco local, buscar informações da UAZAPI para garantir que o nome/ID está sincronizado.

---

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Corrigir parsing da resposta de init, usar endpoint e token corretos para QR code |

---

## Detalhes Técnicos

### Endpoint `/init` - Melhorar Parsing

```typescript
const uazData = await uazResponse.json();

// Capturar nome/ID real da instância
const realInstanceName = uazData?.name || uazData?.instance?.name || instanceName;
const realInstanceId = uazData?.id || uazData?.instance?.id || null;
const instanceToken = uazData?.token || uazData?.instance?.token || null;

// Salvar todos os dados no banco
await supabase.from("broker_whatsapp_instances").upsert({
  broker_id: brokerId,
  instance_name: realInstanceName,  // Usar nome retornado pela UAZAPI
  instance_token: instanceToken,
  // ... outros campos
});
```

### Endpoint `/qrcode` - Usar Token Correto

```typescript
// Usar token da instância (não admin)
const response = await fetch(`${UAZAPI_BASE_URL}/instance/connect`, {
  method: "POST",
  headers: {
    "token": instance.instance_token,  // Token específico da instância
    "Content-Type": "application/json"
  },
  body: JSON.stringify({})
});

// A resposta contém o QR code
const data = await response.json();
return { qrcode: data.qrcode || data.base64, paircode: data.paircode };
```

### Endpoint de Debug - Listar Instâncias

Adicionar endpoint usando `/instance/fetchInstances` com `admintoken`:

```typescript
const response = await fetch(`${UAZAPI_BASE_URL}/instance/fetchInstances`, {
  headers: { "admintoken": UAZAPI_ADMIN_TOKEN }
});
```

---

## Resultado Esperado

Após as correções:
1. O fluxo "Iniciar Conexão" criará a instância e salvará os dados corretos
2. O botão "Novo QR Code" gerará o código usando o token correto da instância
3. O status da conexão será atualizado corretamente
4. Sincronização entre banco local e UAZAPI será mantida

