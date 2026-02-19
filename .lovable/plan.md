

# Permitir retrocesso de etapas na barra de progresso do Lead

## Conceito

Atualmente a barra de progresso so permite avancar para a proxima etapa. A mudanca permitira clicar em **etapas anteriores** para retroceder o lead no funil, util quando um agendamento cai, uma proposta e cancelada, ou o corretor precisa refazer uma etapa.

## Comportamento atualizado da barra

| Segmento | Visual | Clique |
|----------|--------|--------|
| Etapas anteriores | Amarelo escuro, cursor pointer | Abre confirmacao e retrocede o lead |
| Etapa atual | Amarelo brilhante com glow | Nada (tooltip "Etapa atual") |
| Proxima etapa | Borda pulsante, cursor pointer | Abre modal da acao (comportamento atual) |
| Etapas futuras | Cinza, cursor not-allowed | Nada (tooltip "Complete a etapa anterior") |

## Detalhes tecnicos

### Arquivo: `src/pages/LeadPage.tsx`

1. **Tornar etapas anteriores clicaveis** - Etapas com indice menor que `currentStageIndex` terao `cursor-pointer` e um handler de clique

2. **Dialog de confirmacao** - Ao clicar numa etapa anterior, exibir um `AlertDialog` perguntando: "Deseja retornar o lead para a etapa [nome]? O lead sera movido de volta no funil."

3. **Handler de retrocesso** - Usar `updateLeadStatus(leadId, lead.status, targetStatus)` que ja existe no hook `useKanbanLeads`, registrando a mudanca na timeline. Alem disso, limpar campos do funil que nao fazem mais sentido:
   - Retornando para "Pre Atend." (`new`): limpa `atendimento_iniciado_em`, `comparecimento`, `data_agendamento`, `tipo_agendamento`, `valor_proposta`
   - Retornando para "Atendimento" (`info_sent`): limpa `comparecimento`, `data_agendamento`, `tipo_agendamento`, `valor_proposta`
   - Retornando para "Agendamento" (`scheduling`): limpa `comparecimento`, `valor_proposta`
   - Retornando para "Proposta" (`docs_received`): limpa `valor_venda`, `data_fechamento`

4. **Visual das etapas anteriores** - Adicionar hover sutil e icone de seta para a esquerda (`ChevronLeft` ou `RotateCw`) para indicar que sao clicaveis

5. **Tooltip** - Etapas anteriores mostrarao "Clique para retornar a [nome da etapa]"

6. **Registro na timeline** - O `updateLeadStatus` ja insere um registro de `status_change` em `lead_interactions`, entao o retrocesso aparecera automaticamente na timeline do lead

### Logica de clique atualizada

```typescript
const handleStageClick = (stageIndex: number) => {
  if (stageIndex === currentStageIndex) return; // etapa atual
  if (stageIndex > currentStageIndex + 1) return; // etapas futuras distantes

  if (stageIndex < currentStageIndex) {
    // Retrocesso - abre confirmacao
    setReturnTargetStage(FUNNEL_STAGES[stageIndex]);
    setReturnDialogOpen(true);
    return;
  }

  // Avanco (proxima etapa) - logica existente
  // ...
};

const handleConfirmReturn = async () => {
  if (!returnTargetStage || !lead) return;
  const oldStatus = lead.status;
  const newStatus = returnTargetStage.status;

  // Limpar campos do funil conforme a etapa de destino
  const cleanupFields = getCleanupFields(newStatus);
  await supabase.from("leads").update(cleanupFields).eq("id", lead.id);

  // Atualizar status
  await updateLeadStatus(lead.id, oldStatus, newStatus);
  await refreshLead();
  toast.success(`Lead retornado para ${returnTargetStage.label}`);
  setReturnDialogOpen(false);
};
```

### Novos estados no componente

- `returnDialogOpen: boolean` - controla o AlertDialog de confirmacao
- `returnTargetStage: FunnelStage | null` - etapa de destino do retrocesso

Nao sera necessaria nenhuma alteracao de banco de dados. As acoes reutilizam hooks existentes e o kanban reflete a mudanca via realtime.

