import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WhatsAppMessageQueue, QueueStatus, getRandomInterval } from "@/types/whatsapp";

interface QueueStats {
  queued: number;
  sent: number;
  failed: number;
  replies: number;
}

export function useWhatsAppQueue() {
  const queryClient = useQueryClient();
  const [nextSendIn, setNextSendIn] = useState<number | null>(null);

  // Fetch broker ID
  const { data: broker } = useQuery({
    queryKey: ["current-broker"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("brokers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      return data;
    },
  });

  // Fetch queue with lead and campaign info
  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-queue", broker?.id],
    queryFn: async () => {
      if (!broker?.id) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_message_queue")
        .select(`
          *,
          lead:leads(id, name),
          campaign:whatsapp_campaigns(id, name)
        `)
        .eq("broker_id", broker.id)
        .order("scheduled_at", { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data as WhatsAppMessageQueue[];
    },
    enabled: !!broker?.id,
    refetchInterval: 30000,
  });

  // Fetch replies count from whatsapp_lead_replies
  const { data: repliesCount = 0 } = useQuery({
    queryKey: ["whatsapp-replies-count", broker?.id],
    queryFn: async () => {
      if (!broker?.id) return 0;

      // Get broker's campaign IDs
      const { data: campaigns } = await supabase
        .from("whatsapp_campaigns")
        .select("id")
        .eq("broker_id", broker.id);

      if (!campaigns || campaigns.length === 0) return 0;

      const campaignIds = campaigns.map(c => c.id);

      const { count, error } = await supabase
        .from("whatsapp_lead_replies")
        .select("*", { count: "exact", head: true })
        .in("campaign_id", campaignIds);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!broker?.id,
    refetchInterval: 30000,
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!broker?.id) return;

    const channel = supabase
      .channel(`whatsapp-queue-realtime-${broker.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_message_queue",
          filter: `broker_id=eq.${broker.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-queue", broker.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_lead_replies",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-replies-count", broker.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [broker?.id, queryClient]);

  // Calculate stats
  const stats: QueueStats = {
    queued: queue.filter(m => m.status === "queued" || m.status === "scheduled").length,
    sent: queue.filter(m => m.status === "sent").length,
    failed: queue.filter(m => m.status === "failed").length,
    replies: repliesCount,
  };

  // Calculate next send countdown
  useEffect(() => {
    const nextScheduled = queue.find(
      m => (m.status === "queued" || m.status === "scheduled") && 
           new Date(m.scheduled_at) > new Date()
    );
    
    if (!nextScheduled) {
      setNextSendIn(null);
      return;
    }
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const scheduled = new Date(nextScheduled.scheduled_at).getTime();
      const diff = Math.max(0, Math.floor((scheduled - now) / 1000));
      setNextSendIn(diff);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [queue]);

  // Cancel message
  const cancelMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("whatsapp_message_queue")
        .update({ status: "cancelled" as QueueStatus })
        .eq("id", messageId)
        .in("status", ["queued", "scheduled"]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem cancelada");
      refetch();
    },
    onError: () => {
      toast.error("Erro ao cancelar mensagem");
    },
  });

  // Retry failed message
  const retryMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const interval = getRandomInterval();
      const newScheduledAt = new Date(Date.now() + interval);
      
      const { error } = await supabase
        .from("whatsapp_message_queue")
        .update({ 
          status: "scheduled" as QueueStatus,
          scheduled_at: newScheduledAt.toISOString(),
          attempts: 0,
          error_code: null,
          error_message: null,
        })
        .eq("id", messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem reagendada");
      refetch();
    },
    onError: () => {
      toast.error("Erro ao reagendar mensagem");
    },
  });

  // Format countdown for display
  const formatNextSendIn = (): string => {
    if (nextSendIn === null) return "--:--";
    const minutes = Math.floor(nextSendIn / 60);
    const seconds = nextSendIn % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    queue,
    stats,
    isLoading,
    nextSendIn,
    formatNextSendIn,
    cancelMessage: cancelMessageMutation.mutateAsync,
    retryMessage: retryMessageMutation.mutateAsync,
    refetch,
  };
}
