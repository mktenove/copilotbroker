import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CadenciaAtiva {
  isActive: boolean;
  campaignId: string | null;
  nextMessageAt: string | null;
  cancel: () => Promise<void>;
  isLoading: boolean;
}

export function useCadenciaAtiva(leadId: string | undefined): CadenciaAtiva {
  const queryClient = useQueryClient();
  const queryKey = ["cadencia-ativa", leadId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!leadId) return null;

      // Find active cadence for this lead
      const { data: campaigns, error } = await (supabase
        .from("whatsapp_campaigns")
        .select("id, status") as any)
        .eq("lead_id", leadId)
        .eq("status", "running")
        .limit(1);

      if (error) throw error;
      if (!campaigns || campaigns.length === 0) return null;

      const campaign = campaigns[0];

      // Get next scheduled message
      const { data: nextMsg } = await supabase
        .from("whatsapp_message_queue")
        .select("scheduled_at")
        .eq("campaign_id", campaign.id)
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
        .limit(1);

      return {
        campaignId: campaign.id,
        nextMessageAt: nextMsg?.[0]?.scheduled_at || null,
      };
    },
    enabled: !!leadId,
    refetchInterval: 60000, // Refetch every minute to update countdown
  });

  // Realtime subscription for campaign status changes
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`cadencia-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_campaigns" },
        (payload) => {
          const record = payload.new as any;
          if (record?.lead_id === leadId) {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_message_queue" },
        () => {
          // Invalidate to refresh next message time
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!data?.campaignId) return;

      // Cancel campaign
      const { error: campError } = await supabase
        .from("whatsapp_campaigns")
        .update({ status: "cancelled" })
        .eq("id", data.campaignId);

      if (campError) throw campError;

      // Cancel pending messages
      await supabase
        .from("whatsapp_message_queue")
        .update({ status: "cancelled" })
        .eq("campaign_id", data.campaignId)
        .in("status", ["scheduled", "queued", "paused_by_system"]);
    },
    onSuccess: () => {
      toast.success("Cadência cancelada");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast.error("Erro ao cancelar cadência");
    },
  });

  return {
    isActive: !!data?.campaignId,
    campaignId: data?.campaignId || null,
    nextMessageAt: data?.nextMessageAt || null,
    cancel: cancelMutation.mutateAsync,
    isLoading,
  };
}

// Utility to cancel cadence for a lead (used by kanban hooks)
export async function cancelCadenciaForLead(leadId: string): Promise<void> {
  // Cancel all active campaigns (running OR scheduled) — use edge function to bypass RLS
  try {
    await supabase.functions.invoke("cancel-lead-cadencia", { body: { leadId } });
  } catch (err) {
    console.error("[cancelCadenciaForLead] edge function failed, falling back:", err);
    // Fallback: direct DB (may fail silently due to RLS)
    const { data: campaigns } = await (supabase
      .from("whatsapp_campaigns")
      .select("id") as any)
      .eq("lead_id", leadId)
      .in("status", ["running", "scheduled"]);

    if (!campaigns || campaigns.length === 0) return;

    for (const campaign of campaigns) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "cancelled" })
        .eq("id", campaign.id);

      await supabase
        .from("whatsapp_message_queue")
        .update({ status: "cancelled" })
        .eq("campaign_id", campaign.id)
        .in("status", ["scheduled", "queued", "paused_by_system"]);
    }
  }
}
