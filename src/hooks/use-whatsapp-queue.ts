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

export function useWhatsAppQueue(brokerFilterId?: string) {
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

  // Effective broker ID: use filter if provided, otherwise own broker id
  const effectiveBrokerId = brokerFilterId || broker?.id || null;

  // Fetch queue for display (limited to 100)
  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-queue", effectiveBrokerId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select(`
          *,
          lead:leads(id, name),
          campaign:whatsapp_campaigns(id, name)
        `)
        .order("scheduled_at", { ascending: true })
        .limit(100);
      
      if (effectiveBrokerId) {
        query = query.eq("broker_id", effectiveBrokerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppMessageQueue[];
    },
    enabled: !!effectiveBrokerId || !brokerFilterId,
    refetchInterval: 30000,
  });

  // Helper to build filtered query
  const applyBrokerFilter = (query: any) => {
    if (effectiveBrokerId) {
      return query.eq("broker_id", effectiveBrokerId);
    }
    return query;
  };

  // Aggregate count: queued + scheduled
  const { data: queuedCount = 0 } = useQuery({
    queryKey: ["whatsapp-queue-count-queued", effectiveBrokerId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "scheduled"]);
      query = applyBrokerFilter(query);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Aggregate count: sent
  const { data: sentCount = 0 } = useQuery({
    queryKey: ["whatsapp-queue-count-sent", effectiveBrokerId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent");
      query = applyBrokerFilter(query);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Aggregate count: failed
  const { data: failedCount = 0 } = useQuery({
    queryKey: ["whatsapp-queue-count-failed", effectiveBrokerId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed");
      query = applyBrokerFilter(query);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Fetch replies count from whatsapp_lead_replies
  const { data: repliesCount = 0 } = useQuery({
    queryKey: ["whatsapp-replies-count", effectiveBrokerId],
    queryFn: async () => {
      let campaignQuery = supabase
        .from("whatsapp_campaigns")
        .select("id");
      
      if (effectiveBrokerId) {
        campaignQuery = campaignQuery.eq("broker_id", effectiveBrokerId);
      }

      const { data: campaigns } = await campaignQuery;

      if (!campaigns || campaigns.length === 0) return 0;

      const campaignIds = campaigns.map(c => c.id);

      const { count, error } = await supabase
        .from("whatsapp_lead_replies")
        .select("*", { count: "exact", head: true })
        .in("campaign_id", campaignIds);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Realtime subscriptions
  useEffect(() => {
    const channelConfig: any = {
      event: "*",
      schema: "public",
      table: "whatsapp_message_queue",
    };
    
    if (effectiveBrokerId) {
      channelConfig.filter = `broker_id=eq.${effectiveBrokerId}`;
    }

    const channel = supabase
      .channel(`whatsapp-queue-realtime-${effectiveBrokerId || "all"}`)
      .on("postgres_changes", channelConfig, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue", effectiveBrokerId] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-count-queued", effectiveBrokerId] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-count-sent", effectiveBrokerId] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-count-failed", effectiveBrokerId] });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "whatsapp_lead_replies",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-replies-count", effectiveBrokerId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveBrokerId, queryClient]);

  // Stats from aggregate queries
  const stats: QueueStats = {
    queued: queuedCount,
    sent: sentCount,
    failed: failedCount,
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
