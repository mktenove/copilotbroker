

## Correção: Botões Atualizar, Reiniciar e Desconectar

### Problema Identificado

Os logs mostram claramente o erro:
```
UAZAPI Logout Error: {"code":405,"message":"Method Not Allowed.","data":{}}
```

**Causas:**
1. O endpoint `/instance/logout` está sendo chamado com método `DELETE`, mas a UAZAPI espera outro método (provavelmente `POST`)
2. O endpoint `/instance/restart` está usando `PUT`, que também pode estar incorreto
3. Não está usando o sistema de fallback com múltiplos estilos de autenticação que funciona para o `/status`

---

### Solução Proposta

Corrigir os endpoints `/logout` e `/restart` para:
1. Usar o método HTTP correto (provavelmente `POST`)
2. Usar a função `uazapiFetchWithAuthFallback` que faz tentativas com diferentes headers
3. Seguir o mesmo padrão do `/status` que está funcionando

---

### Alterações Técnicas

#### Arquivo: `supabase/functions/whatsapp-instance-manager/index.ts`

**1. Corrigir rota `/logout` (linhas 982-991):**

```typescript
// ANTES:
const uazResponse = await fetch(`${UAZAPI_BASE_URL}/instance/logout`, {
  method: "DELETE",
  headers: {
    "token": instance.instance_token || "",
  },
});

// DEPOIS:
// Try different endpoints and methods (UAZAPI variants use different patterns)
const logoutAttempts = [
  { name: "logout-post", path: "/instance/logout", method: "POST" },
  { name: "logout-delete", path: "/instance/logout", method: "DELETE" },
  { name: "disconnect-post", path: "/instance/disconnect", method: "POST" },
];

let logoutSuccess = false;

for (const attempt of logoutAttempts) {
  console.log(`[LOGOUT] Trying: ${attempt.method} ${attempt.path}`);
  const uazResponse = await uazapiFetchWithAuthFallback(
    `${UAZAPI_BASE_URL}${attempt.path}`,
    { method: attempt.method },
    instance.instance_token || UAZAPI_DEFAULT_TOKEN,
    false,
    [UAZAPI_DEFAULT_TOKEN],
  );

  if (uazResponse.ok) {
    console.log(`[LOGOUT] Success with ${attempt.name}`);
    logoutSuccess = true;
    break;
  }
  
  // 405 = wrong method, try next. Other errors = stop.
  if (uazResponse.status !== 405 && uazResponse.status !== 404) {
    console.error(`[LOGOUT] Failed with ${uazResponse.status}`);
    break;
  }
}
```

**2. Corrigir rota `/restart` (linhas 1047-1058):**

```typescript
// ANTES:
const uazResponse = await fetch(`${UAZAPI_BASE_URL}/instance/restart`, {
  method: "PUT",
  headers: {
    "token": instance.instance_token || "",
  },
});

// DEPOIS:
const restartAttempts = [
  { name: "restart-post", path: "/instance/restart", method: "POST" },
  { name: "restart-put", path: "/instance/restart", method: "PUT" },
  { name: "reconnect-post", path: "/instance/reconnect", method: "POST" },
];

let restartSuccess = false;
let restartError = "";

for (const attempt of restartAttempts) {
  console.log(`[RESTART] Trying: ${attempt.method} ${attempt.path}`);
  const uazResponse = await uazapiFetchWithAuthFallback(
    `${UAZAPI_BASE_URL}${attempt.path}`,
    { method: attempt.method },
    instance.instance_token || UAZAPI_DEFAULT_TOKEN,
    false,
    [UAZAPI_DEFAULT_TOKEN],
  );

  if (uazResponse.ok) {
    console.log(`[RESTART] Success with ${attempt.name}`);
    restartSuccess = true;
    break;
  }
  
  restartError = await uazResponse.text().catch(() => "");
  if (uazResponse.status !== 405 && uazResponse.status !== 404) {
    break;
  }
}

if (!restartSuccess) {
  return c.json({ error: "Failed to restart", details: restartError }, 500, corsHeaders);
}
```

---

### Resumo dos Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Corrigir `/logout` e `/restart` para usar fallback de métodos HTTP e autenticação |

---

### Resultado Esperado

Após a correção:
1. **Botão "Atualizar"** - já funciona (usa `/status` corrigido)
2. **Botão "Desconectar"** - tentará POST primeiro, depois DELETE, com fallback de auth
3. **Botão "Reiniciar"** - tentará POST primeiro, depois PUT, com fallback de auth

---

### Pergunta para o usuário

Se você tiver acesso à documentação da UAZAPI ou ao dashboard, pode confirmar qual é o endpoint correto para desconectar a instância? Endpoints comuns são:
- `POST /instance/logout`
- `DELETE /instance/logout` 
- `POST /instance/disconnect`

