

## Otimização: Endpoint de Desconexão WhatsApp

### Informação Confirmada

O endpoint correto para desconectar é:
- **`POST /instance/disconnect`**

Estados após desconectar:
- `disconnected` - Desconectado do WhatsApp
- `connecting` - Em processo de reconexão

---

## Alteração

### Arquivo: `supabase/functions/whatsapp-instance-manager/index.ts`

Reordenar as tentativas de logout para priorizar o endpoint correto:

**Antes (linha 982-986):**
```typescript
const logoutAttempts = [
  { name: "logout-post", path: "/instance/logout", method: "POST" },
  { name: "logout-delete", path: "/instance/logout", method: "DELETE" },
  { name: "disconnect-post", path: "/instance/disconnect", method: "POST" },
];
```

**Depois:**
```typescript
const logoutAttempts = [
  // Confirmed correct endpoint
  { name: "disconnect-post", path: "/instance/disconnect", method: "POST" },
  // Fallbacks
  { name: "logout-post", path: "/instance/logout", method: "POST" },
  { name: "logout-delete", path: "/instance/logout", method: "DELETE" },
];
```

---

## Resultado Esperado

1. O botão "Desconectar" vai chamar `POST /instance/disconnect` primeiro
2. A API vai retornar sucesso imediatamente (sem testar endpoints errados)
3. O status local será atualizado para `disconnected`
4. Você poderá reconectar e verificar o novo nome da instância

---

## Arquivos a serem alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Reordenar `logoutAttempts` para priorizar `/instance/disconnect` |

