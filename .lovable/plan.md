

## Plano: Validação de Webhook via Path Parameter

### Alteração

**`supabase/functions/whatsapp-webhook/index.ts`**

1. Adicionar nova rota `POST /:token` que valida o token do path contra `UAZAPI_WEBHOOK_SECRET`
2. Manter a rota `POST /` existente (backward compatible — aceita se secret não configurado, rejeita se configurado)
3. Na rota `/:token`, extrair `c.req.param("token")` e comparar com `Deno.env.get("UAZAPI_WEBHOOK_SECRET")`

```typescript
// Nova rota com token no path
app.post("/:token", async (c) => {
  const webhookSecret = Deno.env.get("UAZAPI_WEBHOOK_SECRET");
  if (webhookSecret) {
    const provided = c.req.param("token");
    if (provided !== webhookSecret) {
      console.warn("🚫 Webhook rejected: invalid path token");
      return c.json({ error: "Forbidden" }, 403, corsHeaders);
    }
  }
  // ... mesmo handler existente
});
```

**URL na UAZAPI:**
```
https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-webhook/SEU_SECRET
```

### Configuração
- Criar secret `UAZAPI_WEBHOOK_SECRET` com UUID seguro
- Configurar URL acima no painel da UAZAPI

### Deploy
- `whatsapp-webhook`

