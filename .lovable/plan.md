

# Auditoria Completa de Segurança — Relatório

---

## RESUMO EXECUTIVO

| Severidade | Contagem |
|-----------|----------|
| Crítica    | 5        |
| Alta       | 7        |
| Média      | 6        |
| Baixa      | 4        |
| Informativa| 3        |
| **Total**  | **25**   |

### Top 5 Riscos Mais Críticos
1. **8 Edge Functions sem autenticação** — qualquer pessoa pode invocar operações privilegiadas
2. **Anon key + service role key expostos** em trigger de banco (`trigger_roleta_distribuir`)
3. **Token Meta CAPI na URL** (query string) — vazamento em logs
4. **CORS wildcard** em todas as Edge Functions — permite ataques cross-origin
5. **Potential IDOR** em funções sem auth que aceitam `lead_id`/`broker_id` arbitrários

---

## VULNERABILIDADES DETALHADAS

---

### [CRÍTICA] 1. Edge Functions Sem Autenticação (Unauthenticated Endpoints)

**Localização:** `supabase/config.toml` (todas as funções com `verify_jwt = false`) + código das funções

**Funções afetadas SEM verificação de auth no código:**
- `roleta-distribuir/index.ts` — nenhum auth check
- `roleta-timeout/index.ts` — nenhum auth check
- `notify-new-lead/index.ts` — nenhum auth check
- `notify-transfer/index.ts` — nenhum auth check
- `auto-first-message/index.ts` — nenhum auth check
- `auto-cadencia-10d/index.ts` — nenhum auth check
- `meta-conversions-api/index.ts` — nenhum auth check
- `whatsapp-message-sender/index.ts` — nenhum auth check

**Funções que TÊM auth no código (OK):**
- `copilot-ai/index.ts` — verifica Bearer token via `supabase.auth.getUser()`
- `inbox-send-message/index.ts` — verifica Bearer token
- `whatsapp-instance-manager/index.ts` — verifica via `getUser()` em cada rota

**Severidade:** Crítica (CVSS 9.8)

**Vetor de Ataque:** Qualquer pessoa com a URL pública `https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/roleta-distribuir` pode enviar um POST com `{"lead_id": "uuid", "project_id": "uuid"}` e redistribuir leads, disparar mensagens WhatsApp, criar notificações falsas.

**Impacto:** Manipulação completa de leads, envio de spam via WhatsApp da empresa, exfiltração de dados de leads.

**Recomendação:**
- Adicionar verificação de auth (Bearer token + `getClaims()` ou `getUser()`) em TODAS as funções
- Para funções chamadas internamente (trigger/cron), validar um shared secret ou usar service_role_key como auth

---

### [CRÍTICA] 2. Service Role Key Exposta em DB Trigger

**Localização:** Função SQL `trigger_roleta_distribuir()` no banco de dados

**Evidência:**
```sql
headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb
```

**Severidade:** Crítica (CVSS 9.1)

**Descrição:** O anon key está hardcoded na trigger SQL. Qualquer admin de banco ou alguém que consiga ler a definição da função (via `pg_catalog`) pode extrair essa chave. Embora seja a anon key (não service role), ela permite invocar as Edge Functions sem auth.

**Recomendação:**
- Usar `net.http_post` com service role key armazenada em `vault.secrets` do Supabase
- Ou usar `pg_net` com a anon key mas proteger as Edge Functions com auth própria

---

### [CRÍTICA] 3. Meta CAPI Token na URL (Query String)

**Localização:** `supabase/functions/meta-conversions-api/index.ts`, linha 75

**Evidência:**
```typescript
const url = `https://graph.facebook.com/v21.0/${resolvedPixelId}/events?access_token=${token}`;
```

**Severidade:** Crítica (CVSS 7.5)

**Vetor de Ataque:** Access tokens em query strings são logados em proxies, CDNs, e logs de servidor. Se alguém obtiver acesso aos logs da Edge Function, terá o token do Meta.

**Recomendação:** Enviar o token no header `Authorization: Bearer ${token}` (a Graph API do Meta suporta isso).

---

### [CRÍTICA] 4. Potential SQL-like Injection via ilike Filter

**Localização:** `src/hooks/use-kanban-column.ts`, linha 54

**Evidência:**
```typescript
query = query.or(`name.ilike.%${term}%,whatsapp.ilike.%${term}%`);
```

**Severidade:** Alta (CVSS 6.5)

**Descrição:** O `term` do usuário é interpolado diretamente na string do filtro PostgREST. Um atacante poderia injetar caracteres especiais PostgREST (ex: `)`, `,`, `.`) para manipular a query. Embora PostgREST parametrize a query final, a construção do filtro string-based pode permitir manipulação da estrutura do filtro.

**Recomendação:** Sanitizar `term` removendo caracteres como `(`, `)`, `,`, `.` antes de interpolar. Ou usar `.ilike('name', `%${term}%`)` como chamadas separadas.

---

### [CRÍTICA] 5. CORS Wildcard Universal

**Localização:** Todas as Edge Functions

**Evidência:**
```typescript
"Access-Control-Allow-Origin": "*"
```

**Severidade:** Alta (CVSS 6.1)

**Descrição:** Permite que qualquer site malicioso faça requests autenticados às Edge Functions se o navegador do usuário tiver session cookies/tokens.

**Recomendação:** Restringir `Access-Control-Allow-Origin` para domínios conhecidos: `onovocondominio.com.br`, `onovocondominio.lovable.app`, e o preview URL.

---

### [ALTA] 6. Ausência de Rate Limiting nas Edge Functions

**Localização:** Todas as Edge Functions (exceto `copilot-ai` que verifica 429 do gateway)

**Severidade:** Alta (CVSS 7.0)

**Descrição:** Sem rate limiting, um atacante pode:
- Spam leads via `notify-new-lead` (envio massivo de WhatsApp)
- Bruteforce distribuição de leads via `roleta-distribuir`
- Esgotar créditos do Meta CAPI

**Recomendação:** Implementar rate limiting por IP/token em cada Edge Function.

---

### [ALTA] 7. Ausência de CSRF Protection

**Localização:** `src/pages/Auth.tsx` (login form), `src/pages/BrokerSignup.tsx` (signup form)

**Severidade:** Alta (CVSS 6.5)

**Descrição:** Forms que fazem mutations (login, signup) não possuem token CSRF. Embora SPAs com autenticação via Bearer token sejam menos vulneráveis a CSRF que sessões baseadas em cookies, formulários de login podem ser alvo de login CSRF.

**Recomendação:** Como a auth usa Supabase JWT (não cookies), o risco é mitigado. Monitorar se cookies de sessão forem adicionados no futuro.

---

### [ALTA] 8. Exposição de Dados Internos em Erros

**Localização:** Múltiplas Edge Functions

**Evidência:**
```typescript
// roleta-distribuir/index.ts:260
return new Response(JSON.stringify({ error: error.message }), ...);

// notify-new-lead/index.ts:266
JSON.stringify({ success: false, error: String(error) })
```

**Severidade:** Média (CVSS 5.3)

**Descrição:** Mensagens de erro internas (stack traces, detalhes de banco) são retornadas ao cliente, podendo revelar infraestrutura.

**Recomendação:** Retornar mensagens genéricas ao cliente, logar detalhes apenas no servidor.

---

### [ALTA] 9. Webhook WhatsApp Sem Validação de Origem

**Localização:** `supabase/functions/whatsapp-webhook/index.ts`

**Severidade:** Alta (CVSS 7.5)

**Descrição:** O webhook aceita qualquer POST sem validar assinatura ou secret da UAZAPI. Um atacante pode simular mensagens de WhatsApp, trigger auto-responses, e manipular conversas.

**Recomendação:** Implementar validação de secret/token no header do webhook para confirmar que o request vem da UAZAPI.

---

### [ALTA] 10. Mass Assignment em `updateLead`

**Localização:** `src/hooks/use-kanban-leads.ts`, linha 55

**Evidência:**
```typescript
const { error } = await supabase.from("leads").update({ ...updates, updated_at: ... }).eq("id", leadId);
```

**Severidade:** Alta (CVSS 6.5)

**Descrição:** O objeto `updates` é passado diretamente ao Supabase sem whitelist de campos permitidos. Um atacante manipulando o frontend poderia tentar atualizar campos como `broker_id`, `status`, `roleta_id` diretamente.

**Mitigação existente:** RLS policies limitam quais leads um broker pode atualizar. Porém, dentro do escopo permitido, qualquer campo pode ser alterado.

**Recomendação:** Implementar whitelist de campos permitidos antes de enviar ao Supabase.

---

### [ALTA] 11. Falta de Validação de Input nas Landing Pages

**Localização:** `src/components/FormSection.tsx`, `src/components/goldenview/GVFormSection.tsx`

**Severidade:** Média (CVSS 5.3)

**Descrição:** Embora haja validação básica de WhatsApp, o campo `name` não é validado contra injection. O nome é inserido diretamente no banco e depois renderizado em mensagens WhatsApp via template strings. Um nome malicioso poderia conter caracteres especiais do WhatsApp formatting.

**Recomendação:** Sanitizar nome (limitar caracteres, tamanho máximo de 100 chars) e escapar na renderização.

---

### [ALTA] 12. Deleção em Cascata Manual Sem Transação

**Localização:** `src/hooks/use-kanban-leads.ts`, linhas 217-221

**Evidência:**
```typescript
await supabase.from("lead_documents").delete().eq("lead_id", leadId);
await supabase.from("lead_interactions").delete().eq("lead_id", leadId);
await supabase.from("lead_attribution").delete().eq("lead_id", leadId);
const { error } = await supabase.from("leads").delete().eq("id", leadId);
```

**Severidade:** Média (CVSS 4.0)

**Descrição:** Deleções em múltiplas tabelas sem transação. Se a última falhar, dados ficam órfãos. Não é diretamente uma vulnerabilidade de segurança, mas pode causar inconsistência de dados.

**Recomendação:** Criar uma function `SECURITY DEFINER` no banco que faz a cascata dentro de uma transação, ou usar `ON DELETE CASCADE` nas foreign keys.

---

### [MÉDIA] 13. Logs com Dados Sensíveis

**Localização:** Múltiplas Edge Functions

**Evidência:**
```typescript
// notify-new-lead/index.ts:111
console.log("📥 Notificação recebida:", { leadId, leadName, leadWhatsapp, brokerId, source });

// roleta-distribuir/index.ts:212
console.log("Sending WhatsApp notification to:", cleanBrokerPhone, ...);
```

**Severidade:** Média (CVSS 4.0)

**Descrição:** Telefones de leads e corretores são logados em plaintext nos logs de Edge Functions, acessíveis no dashboard.

**Recomendação:** Mascarar PII nos logs (ex: `5199***7766`).

---

### [MÉDIA] 14. Realtime Channel Sem Filtros Específicos

**Localização:** `src/components/crm/KanbanBoard.tsx`, linhas 219-243

**Evidência:**
```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, ...)
```

**Severidade:** Média (CVSS 4.0)

**Descrição:** O canal realtime escuta TODAS as mudanças na tabela `leads` sem filtrar por `broker_id`. Embora RLS filtre os dados nas queries, os eventos de realtime ainda disparam para todos os clientes conectados, revelando que um lead mudou (mesmo sem revelar conteúdo).

**Recomendação:** Adicionar filtro no canal realtime para `broker_id` quando não é admin.

---

### [MÉDIA] 15. Service Role Key em Chamadas Internas

**Localização:** `supabase/functions/roleta-distribuir/index.ts`, linhas 238-245

**Evidência:**
```typescript
await fetch(`${supabaseUrl}/functions/v1/auto-cadencia-10d`, {
  headers: {
    "Authorization": `Bearer ${supabaseServiceKey}`,
  },
  body: JSON.stringify({ leadId: lead_id }),
});
```

**Severidade:** Média (CVSS 5.0)

**Descrição:** A service role key é usada para chamar outra Edge Function. Se essa chamada fosse interceptada ou logada, a chave seria exposta.

**Recomendação:** Usar a anon key para chamadas inter-funções (já que as funções não validam auth de qualquer forma — resolver a vuln #1 primeiro).

---

### [MÉDIA] 16. Client-Side Role Check na Autenticação

**Localização:** `src/pages/Auth.tsx`, `src/hooks/use-user-role.ts`

**Severidade:** Baixa (CVSS 3.5)

**Descrição:** O redirecionamento pós-login é baseado na role retornada pelo client-side query. Embora RLS proteja os dados, o roteamento é baseado em dados do client. Um atacante poderia manipular a navegação para acessar `/admin` mesmo sendo broker.

**Mitigação existente:** As queries na página admin são protegidas por RLS — o atacante não veria dados. Porém, veria a UI do admin.

**Recomendação:** Adicionar guard components que validam a role antes de renderizar páginas admin.

---

### [BAIXA] 17. `dangerouslySetInnerHTML` em Chart Component

**Localização:** `src/components/ui/chart.tsx`, linha 70

**Severidade:** Baixa (CVSS 2.0)

**Descrição:** Usado para injetar CSS de temas. O conteúdo é gerado internamente (constante `THEMES`), não de input do usuário. Risco mínimo.

---

### [BAIXA] 18. Ausência de Content Security Policy (CSP)

**Localização:** `index.html` — sem meta tag CSP

**Severidade:** Baixa (CVSS 3.0)

**Descrição:** Sem CSP, scripts maliciosos injetados via XSS teriam execução livre.

**Recomendação:** Adicionar header CSP via meta tag ou configuração de servidor.

---

### [BAIXA] 19. PWA Manifest sem Integridade

**Localização:** `public/manifest-crm.json`, `public/manifest-crm-auth.json`

**Severidade:** Informativa

**Descrição:** Manifests PWA não possuem validação de integridade. Risco baixo em contexto de SPA.

---

### [BAIXA] 20. Ausência de Secure/HttpOnly em Cookies

**Severidade:** Informativa

**Descrição:** Supabase JS client usa `localStorage` para tokens, não cookies. Isso é vulnerável a XSS (um script malicioso poderia ler tokens do localStorage) mas protege contra CSRF.

---

### [INFORMATIVA] 21. Supabase Anon Key Pública

**Localização:** `.env`, `trigger_roleta_distribuir()`

**Descrição:** A anon key é pública por design no Supabase. Mas deve ser protegida por RLS policies robustas, o que já é o caso neste projeto.

---

### [INFORMATIVA] 22. Dependência `@dnd-kit` com Versão Mista

**Localização:** `package.json`

**Descrição:** `@dnd-kit/core@^6.3.1` com `@dnd-kit/sortable@^10.0.0` — versão major muito diferente pode indicar incompatibilidade, não é vulnerabilidade de segurança.

---

### [INFORMATIVA] 23. `as any` Type Casting Extensivo

**Localização:** Múltiplos arquivos (hooks, components)

**Descrição:** O uso extensivo de `as any` contorna type checking, podendo esconder erros de runtime. Não é vulnerabilidade direta mas reduz a superfície de proteção do TypeScript.

---

## PLANO DE REMEDIAÇÃO PRIORIZADO

### Fase 1 — Imediato (1-2 dias) — Quick Wins
1. **Adicionar auth nas Edge Functions críticas** (roleta-distribuir, notify-new-lead, notify-transfer) — verificar service role key ou shared secret para chamadas internas
2. **Mover Meta CAPI token para header** `Authorization: Bearer`
3. **Sanitizar search term** no `use-kanban-column.ts` antes de interpolar

### Fase 2 — Curto Prazo (1 semana)
4. **Restringir CORS** para domínios autorizados em todas as Edge Functions
5. **Adicionar validação de assinatura** no webhook do WhatsApp
6. **Implementar whitelist de campos** no `updateLead`
7. **Mascarar PII** nos logs das Edge Functions
8. **Mover anon key do trigger SQL** para `vault.secrets`

### Fase 3 — Médio Prazo (2-4 semanas)
9. **Adicionar CSP header** no `index.html`
10. **Implementar route guards** por role nas páginas admin/broker
11. **Adicionar rate limiting** nas Edge Functions públicas
12. **Criar function SQL transacional** para deleção de leads
13. **Adicionar filtro de broker_id** nos canais realtime

