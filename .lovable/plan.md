

## Correção da Aba "Conexão Global"

### Problema Identificado

A edge function `whatsapp-global-instance-manager` está falhando em todas as requisições devido a um erro no handler de CORS preflight.

**Erro nos logs:**
```
TypeError: Response with null body status cannot have body
```

**Causa:** O código usa `c.text("", 204, corsHeaders)` que tenta enviar um body vazio com status 204. O HTTP 204 (No Content) não permite nenhum corpo na resposta.

### Correção Necessária

#### Arquivo: `supabase/functions/whatsapp-global-instance-manager/index.ts`

Linha 60-63 - Substituir o handler CORS:

```typescript
// ANTES (causa o erro):
app.options("/*", (c) => {
  return c.text("", 204, corsHeaders);
});

// DEPOIS (correto):
app.options("/*", (c) => {
  return new Response(null, { status: 204, headers: corsHeaders });
});
```

#### Arquivo: `src/components/whatsapp/QRCodeDisplay.tsx` (Opcional)

Adicionar `forwardRef` para eliminar o warning do React:

```typescript
import { forwardRef } from "react";

export const QRCodeDisplay = forwardRef<HTMLDivElement, QRCodeDisplayProps>(
  function QRCodeDisplay({ qrCode, isLoading, onRefresh }, ref) {
    return (
      <Card ref={ref} className="...">
        {/* ... conteúdo existente ... */}
      </Card>
    );
  }
);
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-global-instance-manager/index.ts` | Corrigir handler CORS (linha 60-63) |
| `src/components/whatsapp/QRCodeDisplay.tsx` | Adicionar forwardRef (opcional) |

### Após a Correção

1. A edge function será re-deployada automaticamente
2. A aba "Conexão Global" carregará o status corretamente
3. O QR Code poderá ser gerado quando a instância estiver desconectada

