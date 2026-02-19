
# Remover limpeza de dados ao retroceder etapas

## Problema
Ao retornar um lead para uma etapa anterior pela barra de progresso, o sistema limpa campos como `comparecimento`, `data_agendamento`, `valor_proposta`, etc. O usuario quer que **todos os dados sejam preservados**, apenas mudando o status.

## Solucao

### Arquivo: `src/pages/LeadPage.tsx`

1. **Remover a funcao `getCleanupFields`** inteiramente (linhas 314-328)
2. **Remover o bloco de limpeza** dentro de `handleConfirmReturn` (linhas 337-342) que chama `getCleanupFields` e faz update no banco
3. O `handleConfirmReturn` ficara simplificado: apenas chama `updateLeadStatus` para mudar o status e registrar na timeline, sem tocar nos demais campos do lead

### Resultado do `handleConfirmReturn` apos a mudanca

```typescript
const handleConfirmReturn = async () => {
  if (!returnTargetStage || !lead || !leadId) return;
  setReturnProcessing(true);
  try {
    const oldStatus = lead.status;
    const newStatus = returnTargetStage.status;

    // Update status (logs to timeline automatically)
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await updateLeadStatus(leadId, oldStatus, newStatus, userId);
    await refreshLead();
    toast.success(`Lead retornado para ${returnTargetStage.label}`);
  } catch (err: any) {
    toast.error(err.message || "Erro ao retornar etapa");
  } finally {
    setReturnProcessing(false);
    setReturnDialogOpen(false);
    setReturnTargetStage(null);
  }
};
```

Nenhuma alteracao de banco de dados necessaria. Apenas 1 arquivo editado.
