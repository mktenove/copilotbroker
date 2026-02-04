
# Plano: Corrigir Loading Infinito na Aba Automação

## Diagnóstico

O problema ocorre porque:

1. O usuário `maicon.enove@gmail.com` possui **duas roles**: `admin` e `broker`
2. O hook `useUserRole` prioriza `admin` sobre `broker`, então define `role = "admin"`
3. O `brokerId` só é buscado quando `role === "broker"`, ficando `null` para admins
4. O hook `useAutoMessageRules` verifica `if (!brokerId) return;` e **nunca executa a query**
5. O estado `isLoading` permanece `true` indefinidamente

## Solução

Modificar o hook `useUserRole` para **sempre buscar o brokerId** quando o usuário tiver a role `broker`, independentemente de também ter a role `admin`.

---

## Alteração Necessária

### Arquivo: `src/hooks/use-user-role.ts`

**Mudança na lógica (linhas 50-60):**

```typescript
// ANTES: Só busca brokerId se role === "broker"
let brokerId = null;
if (role === "broker") {
  const { data: brokerData } = await supabase
    .from("brokers")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  
  brokerId = brokerData?.id || null;
}

// DEPOIS: Busca brokerId se o usuário TEM a role "broker" (independente de ter admin também)
let brokerId = null;
if (roles.includes("broker")) {  // ← Usar roles.includes em vez de role ===
  const { data: brokerData } = await supabase
    .from("brokers")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  
  brokerId = brokerData?.id || null;
}
```

---

## Por que essa mudança funciona?

| Cenário | Antes | Depois |
|---------|-------|--------|
| Usuário só admin | role="admin", brokerId=null | role="admin", brokerId=null |
| Usuário só broker | role="broker", brokerId="xxx" | role="broker", brokerId="xxx" |
| Usuário admin+broker | role="admin", brokerId=**null** | role="admin", brokerId=**"xxx"** |

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-user-role.ts` | Mudar condição de `role === "broker"` para `roles.includes("broker")` |

---

## Resultado Esperado

- Admin com perfil de corretor terá acesso ao `brokerId`
- A aba Automação carregará corretamente as regras
- Todas as funcionalidades que dependem do `brokerId` funcionarão para admins que também são corretores
