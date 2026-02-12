import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead, LeadStatus } from "@/types/crm";
import { toast } from "sonner";

interface UseKanbanLeadsOptions {
  brokerId?: string | null;
  isAdmin?: boolean;
  projectId?: string | null;
}

export function useKanbanLeads({ brokerId, isAdmin = false, projectId }: UseKanbanLeadsOptions) {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      },
      {
        logInactivation: true,
        oldStatus,
        inactivationReason: reason
      }
    );
  }, [updateLead]);

  const deleteLead = useCallback(async (leadId: string) => {
    try {
      // Deletar dados relacionados primeiro
      await supabase.from("lead_documents").delete().eq("lead_id", leadId);
      await supabase.from("lead_interactions").delete().eq("lead_id", leadId);
      await supabase.from("lead_attribution").delete().eq("lead_id", leadId);
      
      // Deletar o lead
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
    getLeadsByStatus
  };
}
