

## Objetivo
Adicionar funcionalidade de **deletar instância** WhatsApp, removendo completamente a instância da UAZAPI e do banco de dados local.

---

## Endpoint UAZAPI (baseado na documentação)

Conforme o padrão da UAZAPI e APIs similares:
- **Método:** `DELETE`
- **Endpoint:** `/instance/delete` ou `/instance/delete/{instance_name}`

---

## Alterações Técnicas

### 1. Backend: Nova rota `/delete` no Edge Function

**Arquivo:** `supabase/functions/whatsapp-instance-manager/index.ts`

Adicionar nova rota após a rota `/restart`:

```typescript
// DELETE /delete - Delete instance permanently
app.delete("/delete", async (c) => {
  try {
    if (!UAZAPI_BASE_URL) {
      return c.json({ error: "UAZAPI not configured" }, 500, corsHeaders);
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);

    // Get broker instance
    const { data: instanceData } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (!instanceData) {
      return c.json({ error: "No instance to delete" }, 400, corsHeaders);
    }

    const instance = instanceData as { 
      id: string; 
      instance_name: string; 
      instance_token: string | null 
    };

    // Try different delete endpoints (UAZAPI variants)
    const deleteAttempts = [
      { name: "delete", path: "/instance/delete", method: "DELETE" },
      { name: "delete-with-name", path: `/instance/delete/${instance.instance_name}`, method: "DELETE" },
      { name: "delete-post", path: "/instance/delete", method: "POST" },
    ];

    let deleteSuccess = false;

    for (const attempt of deleteAttempts) {
      console.log(`[DELETE] Trying: ${attempt.method} ${attempt.path}`);
      const uazResponse = await uazapiFetchWithAuthFallback(
        `${UAZAPI_BASE_URL}${attempt.path}`,
        { method: attempt.method },
        instance.instance_token || UAZAPI_DEFAULT_TOKEN,
        false,
        [UAZAPI_DEFAULT_TOKEN],
      );

      if (uazResponse.ok) {
        console.log(`[DELETE] Success with ${attempt.name}`);
        deleteSuccess = true;
        break;
      }

      const responseText = await uazResponse.text().catch(() => "");
      console.log(`[DELETE] ${attempt.name} failed with ${uazResponse.status}: ${responseText.substring(0, 100)}`);
      
      // 405 = wrong method, 404 = wrong endpoint, try next
      if (uazResponse.status !== 405 && uazResponse.status !== 404) {
        console.error(`[DELETE] Stopping attempts due to status ${uazResponse.status}`);
        break;
      }
    }

    // Even if UAZAPI delete fails, delete local record
    // (instance may have been manually deleted from UAZAPI)
    
    // Delete related data first (message queue, stats, etc.)
    await supabase
      .from("whatsapp_message_queue")
      .delete()
      .eq("broker_id", brokerId);

    // Delete the instance record
    await supabase
      .from("broker_whatsapp_instances")
      .delete()
      .eq("id", instance.id);

    return c.json({
      success: true,
      message: deleteSuccess 
        ? "Instance deleted from UAZAPI and database" 
        : "Instance deleted from database (UAZAPI may have already been deleted)",
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Delete Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});
```

---

### 2. Frontend: Adicionar função `deleteInstance` no hook

**Arquivo:** `src/hooks/use-whatsapp-instance.ts`

Adicionar nova função ao hook:

```typescript
const deleteInstance = useCallback(async () => {
  try {
    setIsLoading(true);

    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTION_URL}/delete`, {
      method: "DELETE",
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to delete instance");
    }

    // Clear local state
    setInstance(null);
    setQRCode(null);
    
    toast({
      title: "Instância deletada",
      description: "A instância WhatsApp foi removida completamente.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    toast({
      title: "Erro ao deletar",
      description: message,
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
}, [toast]);
```

Atualizar interface e retorno:
```typescript
interface UseWhatsAppInstanceReturn {
  // ... existentes ...
  deleteInstance: () => Promise<void>;
}

return {
  // ... existentes ...
  deleteInstance,
};
```

---

### 3. Frontend: Adicionar botão na UI com confirmação

**Arquivo:** `src/components/whatsapp/ConnectionTab.tsx`

Adicionar diálogo de confirmação e botão de deletar:

```typescript
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// No componente, adicionar:
const { deleteInstance } = useWhatsAppInstance();

// Na área de botões, adicionar após "Desconectar":
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      disabled={isLoading}
      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      Deletar
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent className="bg-[#1a1a1d] border-[#2a2a2e]">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-white">Deletar instância?</AlertDialogTitle>
      <AlertDialogDescription className="text-slate-400">
        Esta ação é irreversível. A instância será removida permanentemente 
        e você precisará criar uma nova conexão do zero.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]">
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={deleteInstance}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        Deletar permanentemente
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Fluxo de Uso

1. Usuário clica em "Deletar"
2. Aparece diálogo de confirmação
3. Ao confirmar:
   - Backend tenta deletar na UAZAPI
   - Remove mensagens da fila relacionadas
   - Remove registro do banco de dados
4. UI volta ao estado inicial (botão "Iniciar Conexão")

---

## Arquivos a serem alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Adicionar rota `DELETE /delete` |
| `src/hooks/use-whatsapp-instance.ts` | Adicionar função `deleteInstance` |
| `src/components/whatsapp/ConnectionTab.tsx` | Adicionar botão com confirmação |

---

## Segurança

- Requer autenticação (token JWT)
- Só permite deletar instância do próprio corretor
- Confirmação obrigatória antes de deletar
- Limpa dados relacionados (fila de mensagens)

