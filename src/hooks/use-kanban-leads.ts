import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead, LeadStatus } from "@/types/crm";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseKanbanLeadsOptions {
  brokerId?: string | null;
  isAdmin?: boolean;
  projectId?: string | null;
}

export function useKanbanLeads({ brokerId, isAdmin = false, projectId }: UseKanbanLeadsOptions) {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("leads")
        .select(`
          *,
          broker:brokers!leads_broker_id_fkey(id, name, slug),
          project:projects(id, name, slug, city_slug),
          attribution:lead_attribution(landing_page)
        `)
        .neq("status", "inactive")
        .order("last_interaction_at", { ascending: false });

      if (!isAdmin && brokerId) {
        query = query.eq("broker_id", brokerId);
      }

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform attribution from array to single object (take first if exists)
      const transformedData = (data || []).map((lead: any) => ({
        ...lead,
        attribution: Array.isArray(lead.attribution) && lead.attribution.length > 0 
          ? lead.attribution[0] 
          : lead.attribution
      }));
      
      setLeads(transformedData as unknown as CRMLead[]);
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
      toast.error("Erro ao carregar leads.");
    } finally {
      setIsLoading(false);
    }
  }, [brokerId, isAdmin, projectId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Realtime subscription for lead updates (reassignment, status changes)
  useEffect(() => {
    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('kanban-leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const updatedLead = payload.new as any;
          const oldLead = payload.old as any;

          // Lead became inactive → remove from kanban
          if (updatedLead.status === 'inactive') {
            setLeads(prev => prev.filter(l => l.id !== updatedLead.id));
            return;
          }

          // For brokers: check if broker_id changed (reassignment)
          if (!isAdmin && brokerId) {
            const wasMyLead = oldLead.broker_id === brokerId;
            const isMyLead = updatedLead.broker_id === brokerId;

            if (wasMyLead && !isMyLead) {
              // Lead was reassigned away from this broker → remove
              setLeads(prev => prev.filter(l => l.id !== updatedLead.id));
              return;
            }

            if (!wasMyLead && isMyLead) {
              // Lead was reassigned TO this broker → refetch to get full join data
              fetchLeads();
              return;
            }

            if (!isMyLead) {
              // Not my lead, ignore
              return;
            }
          }

          // Update the lead in local state (keep existing join data)
          setLeads(prev => prev.map(l => 
            l.id === updatedLead.id 
              ? { ...l, ...updatedLead }
              : l
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const newLead = payload.new as any;
          
          // For brokers, only add if it's their lead
          if (!isAdmin && brokerId && newLead.broker_id !== brokerId) return;
          if (newLead.status === 'inactive') return;

          // Refetch to get full join data (broker, project, attribution)
          fetchLeads();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brokerId, isAdmin, fetchLeads]);

  const updateLeadStatus = useCallback(async (
    leadId: string,
    oldStatus: LeadStatus,
    newStatus: LeadStatus,
    userId?: string
  ) => {
    try {
      // Update lead status
      const { error: updateError } = await supabase
        .from("leads")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);

      if (updateError) throw updateError;

      // Record the interaction
      const { error: interactionError } = await supabase
        .from("lead_interactions")
        .insert({
          lead_id: leadId,
          interaction_type: "status_change",
          old_status: oldStatus,
          new_status: newStatus,
          created_by: userId
        });

      if (interactionError) throw interactionError;

      // Update local state optimistically
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
          : lead
      ));

      return true;
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do lead.");
      return false;
    }
  }, []);

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
      const { error } = await supabase
        .from("leads")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);

      if (error) throw error;

      // Log origin change if applicable
      if (options?.logOriginChange && updates.lead_origin !== undefined) {
        const oldOrigin = options.oldOrigin || null;
        const newOrigin = updates.lead_origin || null;
        
        await supabase
          .from("lead_interactions")
          .insert({
            lead_id: leadId,
            interaction_type: "origin_change",
            notes: `Origem alterada de "${oldOrigin || 'Não definida'}" para "${newOrigin || 'Não definida'}"`,
          });
      }

      // Log inactivation if applicable
      if (options?.logInactivation && updates.status === "inactive") {
        await supabase
          .from("lead_interactions")
          .insert({
            lead_id: leadId,
            interaction_type: "inactivation",
            old_status: options.oldStatus,
            new_status: "inactive",
            notes: `Lead inativado. Motivo: ${options.inactivationReason || 'Não especificado'}`,
          });
      }

      setLeads(prev => {
        // If lead was inactivated, remove from local state
        if (updates.status === "inactive") {
          return prev.filter(lead => lead.id !== leadId);
        }
        return prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, ...updates, updated_at: new Date().toISOString() }
            : lead
        );
      });

      return true;
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast.error("Erro ao atualizar lead.");
      return false;
    }
  }, []);

  const inactivateLead = useCallback(async (
    leadId: string,
    reason: string,
    oldStatus: LeadStatus
  ) => {
    return updateLead(
      leadId,
      {
        status: "inactive" as LeadStatus,
        inactivation_reason: reason,
        inactivated_at: new Date().toISOString(),
        data_perda: new Date().toISOString(),
        etapa_perda: oldStatus,
      } as any,
      {
        logInactivation: true,
        oldStatus,
        inactivationReason: reason
      }
    );
  }, [updateLead]);

  // === FUNNEL TRANSITION METHODS ===

  const iniciarAtendimento = useCallback(async (leadId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({
          status: "info_sent" as any,
          atendimento_iniciado_em: now,
          status_distribuicao: 'atendimento_iniciado' as any,
          reserva_expira_em: null,
          updated_at: now,
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "atendimento_iniciado" as any,
        old_status: "new",
        new_status: "info_sent",
        notes: "Atendimento iniciado pelo corretor",
      });

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: "info_sent" as LeadStatus, atendimento_iniciado_em: now, updated_at: now } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro ao iniciar atendimento:", error);
      toast.error("Erro ao iniciar atendimento.");
      return false;
    }
  }, []);

  const registrarAgendamento = useCallback(async (leadId: string, dataAgendamento: Date, tipoAgendamento: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({
          status: "scheduling" as any,
          data_agendamento: dataAgendamento.toISOString(),
          tipo_agendamento: tipoAgendamento,
          updated_at: now,
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "agendamento_registrado" as any,
        old_status: "info_sent",
        new_status: "scheduling",
        notes: `Agendamento: ${tipoAgendamento} em ${dataAgendamento.toLocaleDateString("pt-BR")}`,
      });

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: "scheduling" as LeadStatus, data_agendamento: dataAgendamento.toISOString(), tipo_agendamento: tipoAgendamento, updated_at: now } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro ao registrar agendamento:", error);
      toast.error("Erro ao registrar agendamento.");
      return false;
    }
  }, []);

  const registrarComparecimentoEProposta = useCallback(async (leadId: string, valorProposta: number) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({
          status: "docs_received" as any,
          comparecimento: true,
          valor_proposta: valorProposta,
          data_envio_proposta: now,
          updated_at: now,
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert([
        {
          lead_id: leadId,
          interaction_type: "comparecimento_registrado" as any,
          notes: "✅ Cliente compareceu",
        },
        {
          lead_id: leadId,
          interaction_type: "proposta_enviada" as any,
          old_status: "scheduling",
          new_status: "docs_received",
          notes: `Proposta enviada: R$ ${valorProposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        }
      ]);

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: "docs_received" as LeadStatus, comparecimento: true, valor_proposta: valorProposta, data_envio_proposta: now, updated_at: now } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro ao registrar comparecimento:", error);
      toast.error("Erro ao registrar comparecimento.");
      return false;
    }
  }, []);

  const registrarComparecimento = useCallback(async (leadId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({
          comparecimento: true,
          updated_at: now,
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "comparecimento_registrado" as any,
        notes: "✅ Cliente compareceu",
      });

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, comparecimento: true, updated_at: now } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro ao registrar comparecimento:", error);
      toast.error("Erro ao registrar comparecimento.");
      return false;
    }
  }, []);

  const registrarProposta = useCallback(async (leadId: string, valorProposta: number) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({
          status: "docs_received" as any,
          valor_proposta: valorProposta,
          data_envio_proposta: now,
          updated_at: now,
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "proposta_enviada" as any,
        old_status: "scheduling",
        new_status: "docs_received",
        notes: `Proposta enviada: R$ ${valorProposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: "docs_received" as LeadStatus, valor_proposta: valorProposta, data_envio_proposta: now, updated_at: now } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro ao registrar proposta:", error);
      toast.error("Erro ao registrar proposta.");
      return false;
    }
  }, []);

  const registrarNaoComparecimento = useCallback(async (leadId: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          comparecimento: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "comparecimento_registrado" as any,
        notes: "❌ Cliente não compareceu",
      });

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, comparecimento: false } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro:", error);
      return false;
    }
  }, []);

  const reagendarLead = useCallback(async (leadId: string, dataAgendamento: Date, tipoAgendamento: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({
          data_agendamento: dataAgendamento.toISOString(),
          tipo_agendamento: tipoAgendamento,
          comparecimento: null,
          updated_at: now,
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "reagendamento" as any,
        notes: `Reagendamento: ${tipoAgendamento} em ${dataAgendamento.toLocaleDateString("pt-BR")}`,
      });

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, data_agendamento: dataAgendamento.toISOString(), tipo_agendamento: tipoAgendamento, comparecimento: null, updated_at: now } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro:", error);
      return false;
    }
  }, []);

  const confirmarVenda = useCallback(async (leadId: string, valorFinal: number, dataFechamento: Date) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({
          status: "registered" as any,
          valor_final_venda: valorFinal,
          data_fechamento: dataFechamento.toISOString(),
          registered_at: now,
          updated_at: now,
        })
        .eq("id", leadId);
      if (error) throw error;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "venda_confirmada" as any,
        old_status: "docs_received",
        new_status: "registered",
        notes: `Venda confirmada: R$ ${valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });

      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: "registered" as LeadStatus, valor_final_venda: valorFinal, data_fechamento: dataFechamento.toISOString(), updated_at: now } : l
      ));
      return true;
    } catch (error) {
      console.error("Erro ao confirmar venda:", error);
      toast.error("Erro ao confirmar venda.");
      return false;
    }
  }, []);

  const deleteLead = useCallback(async (leadId: string) => {
    try {
      await supabase.from("lead_documents").delete().eq("lead_id", leadId);
      await supabase.from("lead_interactions").delete().eq("lead_id", leadId);
      await supabase.from("lead_attribution").delete().eq("lead_id", leadId);
      
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
      
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      toast.success("Lead excluído com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      toast.error("Erro ao excluir lead.");
      return false;
    }
  }, []);

  const getLeadsByStatus = useCallback((status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  }, [leads]);

  return {
    leads,
    isLoading,
    fetchLeads,
    updateLeadStatus,
    updateLead,
    inactivateLead,
    deleteLead,
    getLeadsByStatus,
    // Funnel transition methods
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
