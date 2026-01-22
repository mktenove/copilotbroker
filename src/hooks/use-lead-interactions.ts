import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeadInteraction, InteractionType, LeadStatus } from "@/types/crm";
import { toast } from "sonner";

export function useLeadInteractions(leadId: string | null) {
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInteractions = useCallback(async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_interactions")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInteractions((data || []) as unknown as LeadInteraction[]);
    } catch (error) {
      console.error("Erro ao buscar interações:", error);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const addInteraction = useCallback(async (
    interactionType: InteractionType,
    options: {
      channel?: string;
      notes?: string;
      oldStatus?: LeadStatus;
      newStatus?: LeadStatus;
      createdBy?: string;
    } = {}
  ) => {
    if (!leadId) return false;

    try {
      const { data, error } = await supabase
        .from("lead_interactions")
        .insert({
          lead_id: leadId,
          interaction_type: interactionType,
          channel: options.channel,
          notes: options.notes,
          old_status: options.oldStatus,
          new_status: options.newStatus,
          created_by: options.createdBy
        })
        .select()
        .single();

      if (error) throw error;

      setInteractions(prev => [data as unknown as LeadInteraction, ...prev]);
      return true;
    } catch (error) {
      console.error("Erro ao adicionar interação:", error);
      toast.error("Erro ao registrar interação.");
      return false;
    }
  }, [leadId]);

  return {
    interactions,
    isLoading,
    fetchInteractions,
    addInteraction
  };
}
