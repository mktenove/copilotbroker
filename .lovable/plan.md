

## Plano: Restringir CORS + Validação de Origem no Webhook

### Situação Atual

**Já corrigidas** (usam `getCorsHeaders` ou CORS dinâmico local):
- `_shared/security.ts`, `meta-conversions-api`, `roleta-distribuir`, `notify-new-lead`, `notify-transfer`, `auto-first-message`, `auto-cadencia-10d`, `roleta-timeout`, `whatsapp-message-sender`, `whatsapp-webhook`

**Ainda com CORS wildcard (`"*"`)**:
1. `inbox-send-message/index.ts` — hardcoded `"*"`
2. `copilot-ai/index.ts` — hardcoded `"*"`
3. `whatsapp-global-instance-manager/index.ts` — hardcoded `"*"`
4. `whatsapp-instance-manager/index.ts` — hardcoded `"*"`

**Webhook WhatsApp** — já tem CORS dinâmico mas **não valida origem** nos POSTs recebidos da UAZAPI (qualquer IP pode enviar payloads falsos).

---

### Alterações

#### 1. `inbox-send-message/index.ts`
- Substituir o `corsHeaders` hardcoded por import de `getCorsHeaders` do `_shared/security.ts`
- Usar `getCorsHeaders(req)` em todas as respostas

#### 2. `copilot-ai/index.ts`
- Mesmo: importar `getCorsHeaders`, substituir wildcard

#### 3. `whatsapp-global-instance-manager/index.ts`
- Mesmo: importar `getCorsHeaders`, substituir wildcard

#### 4. `whatsapp-instance-manager/index.ts`
- Mesmo: importar `getCorsHeaders`, substituir wildcard (este usa Hono, então adaptar para extrair origin do request)

#### 5. `whatsapp-webhook/index.ts` — Validação de Origem
- Adicionar verificação de token secreto (`UAZAPI_WEBHOOK_SECRET`) no header dos POSTs recebidos
- Se o secret não estiver configurado, aceitar tudo (backward compatible)
- Se estiver configurado, rejeitar requests sem o token correto com 403

#### 6. Deploy de todas as funções alteradas

---

### Detalhes Técnicos

**CORS dinâmico** — Origens autorizadas (já definidas em `_shared/security.ts`):
- `https://onovocondominio.com.br`
- `https://onovocondominio.lovable.app`
- `https://id-preview--8855e0c5-1ec6-49e7-83f4-12e453004e21.lovable.app`

**Webhook validation** — Lógica no POST handler:
```typescript
const webhookSecret = Deno.env.get("UAZAPI_WEBHOOK_SECRET");
if (webhookSecret) {
  const provided = c.req.header("x-webhook-secret") || c.req.header("token");
  if (provided !== webhookSecret) {
    return c.json({ error: "Forbidden" }, 403);
  }
}
```

