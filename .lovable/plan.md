

# Plano: Atualizar Notificações para Usar Token Persistido

## Problema Identificado

A função de notificação `notify-new-lead` ainda usa tokens das variáveis de ambiente (`UAZAPI_TOKEN`), que estão desatualizados. A nova instância que você conectou gerou um novo token (`984cd567-f34b-4528-a5bf-7fb70dd4f869`) que está salvo no banco, mas a função não está consultando essa tabela.

**Resultado:** Erro 405 (Method Not Allowed) ao tentar enviar notificações.

## Solução

Atualizar a edge function `notify-new-lead` para buscar o token da tabela `global_whatsapp_config` antes de enviar mensagens, usando a mesma lógica implementada no `whatsapp-global-instance-manager`.

## Alterações Necessárias

### 1. Atualizar `supabase/functions/notify-new-lead/index.ts`

```text
Adicionar lógica para:
1. Buscar instância ativa da tabela global_whatsapp_config
2. Usar o instance_token e instance_name do banco
3. Fallback para variáveis de ambiente se não houver registro no banco
4. Construir URL dinâmica baseada no nome da instância
```

**Fluxo atualizado:**

```
┌─────────────────────────────────────────────────────────────┐
│                  notify-new-lead                             │
├─────────────────────────────────────────────────────────────┤
│  1. Receber dados do lead (nome, whatsapp, broker_id)       │
│                         ↓                                    │
│  2. Buscar token em global_whatsapp_config                  │
│     └─ Se não existir, usar UAZAPI_TOKEN (env)              │
│                         ↓                                    │
│  3. Construir URL: UAZAPI_BASE_URL + instance_name          │
│                         ↓                                    │
│  4. Enviar mensagem via POST /send/text                     │
│     └─ Header: token = instance_token do banco              │
│                         ↓                                    │
│  5. Registrar resultado em lead_interactions                │
└─────────────────────────────────────────────────────────────┘
```

### 2. Atualizar status da instância no banco

Também vou garantir que quando a instância conectar, o status seja atualizado para `connected` na tabela `global_whatsapp_config`.

---

## Detalhes Técnicos

**Código para buscar token do banco:**
```typescript
const getStoredGlobalInstance = async () => {
  const { data } = await supabase
    .from("global_whatsapp_config")
    .select("instance_name, instance_token, status")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
};
```

**Lógica de fallback:**
```typescript
const storedInstance = await getStoredGlobalInstance();
const token = storedInstance?.instance_token || Deno.env.get("UAZAPI_TOKEN");
const baseUrl = storedInstance 
  ? `${Deno.env.get("UAZAPI_INSTANCE_URL")?.replace(/\/[^\/]+$/, '')}/${storedInstance.instance_name}`
  : Deno.env.get("UAZAPI_INSTANCE_URL");
```

---

## Resultado Esperado

Após a implementação:
- Notificações usarão o token correto do banco de dados
- O sistema funcionará mesmo após reconexões/novos QR Codes
- Fallback para variáveis de ambiente mantém compatibilidade

