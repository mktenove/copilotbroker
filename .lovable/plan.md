

## Plano: Inicializar Status Padrão como "Conectado"

### Alteração

Modificar o hook `useWhatsAppGlobalInstance` para iniciar com `status: "connected"` ao invés de `"disconnected"`.

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-whatsapp-global-instance.ts` | Alterar valor inicial do status de `"disconnected"` para `"connected"` |

### Mudança Específica

```typescript
// Linha 18 - ANTES:
const [state, setState] = useState<GlobalInstanceState>({
  status: "disconnected",
  // ...
});

// DEPOIS:
const [state, setState] = useState<GlobalInstanceState>({
  status: "connected",
  // ...
});
```

### Consideração

Se a instância estiver realmente desconectada, o status inicial aparecerá como "Conectado" por ~1 segundo antes de corrigir para "Desconectado". Como a instância global normalmente fica conectada, isso provavelmente não será um problema na prática.

