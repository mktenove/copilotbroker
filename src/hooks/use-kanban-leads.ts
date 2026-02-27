import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead, LeadStatus } from "@/types/crm";
import { toast } from "sonner";
import { cancelCadenciaForLead } from "@/hooks/use-cadencia-ativa";

interface UseKanbanLeadsOptions {
  brokerId?: string | null;
  isAdmin?: boolean;
  projectId?: string | null;
}

export function useKanbanLeads({ brokerId, isAdmin = false, projectId }: UseKanbanLeadsOptions) {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["kanban-column"] });
    queryClient.invalidateQueries({ queryKey: ["kanban-count"] });
  }, [queryClient]);

  const invalidateStatuses = useCallback((...statuses: LeadStatus[]) => {
    statuses.forEach(s => {
      queryClient.invalidateQueries({ queryKey: ["kanban-column", s] });
      queryClient.invalidateQueries({ queryKey: ["kanban-count", s] });
    });
  }, [queryClient]);

  const updateLeadStatus = useCallback(async (leadId: string, oldStatus: LeadStatus, newStatus: LeadStatus, userId?: string) => {
    try {
      const { error: updateError } = await supabase.from("leads").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", leadId);
      if (updateError) throw updateError;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "status_change", old_status: oldStatus, new_status: newStatus, created_by: userId });
      invalidateStatuses(oldStatus, newStatus);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do lead.");
      return false;
    }
  }, [invalidateStatuses]);

  const updateLead = useCallback(async (
    leadId: string,
    updates: Partial<CRMLead>,
    options?: {
      logOriginChange?: boolean;
      oldOrigin?: string | null;
      logInactivation?: boolean;
      oldStatus?: LeadStatus;
      inactivationReason?: string;
    }
  ) => {
    try {
      const { error } = await supabase.from("leads").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", leadId);
      if (error) throw error;

      if (options?.logOriginChange && updates.lead_origin !== undefined) {
        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          interaction_type: "origin_change",
          notes: `Origem alterada de "${options.oldOrigin || 'Não definida'}" para "${updates.lead_origin || 'Não definida'}"`,
        });
      }

      if (options?.logInactivation && updates.status === "inactive") {
        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          interaction_type: "inactivation",
          old_status: options.oldStatus,
          new_status: "inactive",
          notes: `Lead inativado. Motivo: ${options.inactivationReason || 'Não especificado'}`,
        });
      }

      invalidateAll();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast.error("Erro ao atualizar lead.");
      return false;
    }
  }, [invalidateAll]);

  const inactivateLead = useCallback(async (leadId: string, reason: string, oldStatus: LeadStatus) => {
    await cancelCadenciaForLead(leadId);
    return updateLead(
      leadId,
      { status: "inactive" as LeadStatus, inactivation_reason: reason, inactivated_at: new Date().toISOString(), data_perda: new Date().toISOString(), etapa_perda: oldStatus } as any,
      { logInactivation: true, oldStatus, inactivationReason: reason }
    );
  }, [updateLead]);

  const iniciarAtendimento = useCallback(async (leadId: string) => {
    try {
      const now = new Date().toISOString();
      const [userResult, updateResult] = await Promise.all([
        supabase.auth.getUser().then(async ({ data }) => {
          const { data: broker } = await supabase.from("brokers").select("id, name").eq("user_id", data.user?.id ?? "").single();
          return { user: data.user, broker };
        }),
        supabase.from("leads")
          .update({ status: "info_sent" as any, atendimento_iniciado_em: now, status_distribuicao: 'atendimento_iniciado' as any, reserva_expira_em: null, updated_at: now })
          .eq("id", leadId),
      ]);

      if (updateResult.error) throw updateResult.error;

      supabase.from("lead_interactions").insert({
        lead_id: leadId, interaction_type: "atendimento_iniciado" as any, old_status: "new", new_status: "info_sent",
        broker_id: userResult.broker?.id, notes: `Atendimento iniciado por ${userResult.broker?.name || "corretor"}`, created_by: userResult.user?.id,
      }).then(({ error }) => { if (error) console.error("Erro ao logar interação:", error); });

      invalidateStatuses("new", "info_sent");
      return { success: true, userId: userResult.user?.id };
    } catch (error) {
      console.error("Erro ao iniciar atendimento:", error);
      toast.error("Erro ao iniciar atendimento.");
      return { success: false };
    }
  }, [invalidateStatuses]);

  const registrarAgendamento = useCallback(async (leadId: string, dataAgendamento: Date, tipoAgendamento: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({ status: "scheduling" as any, data_agendamento: dataAgendamento.toISOString(), tipo_agendamento: tipoAgendamento, updated_at: now }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "agendamento_registrado" as any, old_status: "info_sent", new_status: "scheduling", notes: `Agendamento: ${tipoAgendamento} em ${dataAgendamento.toLocaleDateString("pt-BR")}` });
      invalidateStatuses("info_sent", "scheduling");
      return true;
    } catch (error) { console.error("Erro ao registrar agendamento:", error); toast.error("Erro ao registrar agendamento."); return false; }
  }, [invalidateStatuses]);

  const registrarComparecimentoEProposta = useCallback(async (leadId: string, valorProposta: number) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({ status: "docs_received" as any, comparecimento: true, valor_proposta: valorProposta, data_envio_proposta: now, updated_at: now }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert([
        { lead_id: leadId, interaction_type: "comparecimento_registrado" as any, notes: "✅ Cliente compareceu" },
        { lead_id: leadId, interaction_type: "proposta_enviada" as any, old_status: "scheduling", new_status: "docs_received", notes: `Proposta enviada: R$ ${valorProposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` }
      ]);
      invalidateStatuses("scheduling", "docs_received");
      return true;
    } catch (error) { console.error("Erro ao registrar comparecimento:", error); toast.error("Erro ao registrar comparecimento."); return false; }
  }, [invalidateStatuses]);

  const registrarComparecimento = useCallback(async (leadId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({ comparecimento: true, updated_at: now }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "comparecimento_registrado" as any, notes: "✅ Cliente compareceu" });
      invalidateStatuses("scheduling");
      return true;
    } catch (error) { console.error("Erro ao registrar comparecimento:", error); toast.error("Erro ao registrar comparecimento."); return false; }
  }, [invalidateStatuses]);

  const registrarProposta = useCallback(async (leadId: string, valorProposta: number) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({ status: "docs_received" as any, valor_proposta: valorProposta, data_envio_proposta: now, updated_at: now }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "proposta_enviada" as any, old_status: "scheduling", new_status: "docs_received", notes: `Proposta enviada: R$ ${valorProposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` });
      invalidateStatuses("scheduling", "docs_received");
      return true;
    } catch (error) { console.error("Erro ao registrar proposta:", error); toast.error("Erro ao registrar proposta."); return false; }
  }, [invalidateStatuses]);

  const registrarNaoComparecimento = useCallback(async (leadId: string) => {
    try {
      const { error } = await supabase.from("leads").update({ comparecimento: false, updated_at: new Date().toISOString() }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "comparecimento_registrado" as any, notes: "❌ Cliente não compareceu" });
      invalidateStatuses("scheduling");
      return true;
    } catch (error) { console.error("Erro:", error); return false; }
  }, [invalidateStatuses]);

  const reagendarLead = useCallback(async (leadId: string, dataAgendamento: Date, tipoAgendamento: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({ data_agendamento: dataAgendamento.toISOString(), tipo_agendamento: tipoAgendamento, comparecimento: null, updated_at: now }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "reagendamento" as any, notes: `Reagendamento: ${tipoAgendamento} em ${dataAgendamento.toLocaleDateString("pt-BR")}` });
      invalidateStatuses("scheduling");
      return true;
    } catch (error) { console.error("Erro:", error); return false; }
  }, [invalidateStatuses]);

  const confirmarVenda = useCallback(async (leadId: string, valorFinal: number, dataFechamento: Date) => {
    try {
      await cancelCadenciaForLead(leadId);
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({ status: "registered" as any, valor_final_venda: valorFinal, data_fechamento: dataFechamento.toISOString(), registered_at: now, updated_at: now }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "venda_confirmada" as any, old_status: "docs_received", new_status: "registered", notes: `Venda confirmada: R$ ${valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` });
      invalidateStatuses("docs_received", "registered");
      return true;
    } catch (error) { console.error("Erro ao confirmar venda:", error); toast.error("Erro ao confirmar venda."); return false; }
  }, [invalidateStatuses]);

  const reactivateLead = useCallback(async (leadId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({ status: "new" as any, inactivation_reason: null, inactivated_at: null, data_perda: null, etapa_perda: null, updated_at: now }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_interactions").insert({ lead_id: leadId, interaction_type: "reactivation" as any, old_status: "inactive", new_status: "new", notes: "Lead reativado" });
      invalidateStatuses("new");
      toast.success("Lead reativado com sucesso!");
      return true;
    } catch (error) { console.error("Erro ao reativar lead:", error); toast.error("Erro ao reativar lead."); return false; }
  }, [invalidateStatuses]);

  const deleteLead = useCallback(async (leadId: string) => {
    try {
      await supabase.from("lead_documents").delete().eq("lead_id", leadId);
      await supabase.from("lead_interactions").delete().eq("lead_id", leadId);
      await supabase.from("lead_attribution").delete().eq("lead_id", leadId);
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
      invalidateAll();
      toast.success("Lead excluído com sucesso!");
      return true;
    } catch (error) { console.error("Erro ao excluir lead:", error); toast.error("Erro ao excluir lead."); return false; }
  }, [invalidateAll]);

  return {
    invalidateAll,
    updateLeadStatus,
    updateLead,
    inactivateLead,
    reactivateLead,
    deleteLead,
    iniciarAtendimento,
    registrarAgendamento,
    registrarComparecimentoEProposta,
    registrarComparecimento,
    registrarProposta,
    registrarNaoComparecimento,
    reagendarLead,
    confirmarVenda,
  };
}
