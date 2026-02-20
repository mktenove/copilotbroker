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
  paused: number;
}

const PAGE_SIZE = 50;

export function useWhatsAppQueue(brokerFilterId?: string) {
  const queryClient = useQueryClient();
  const [nextSendIn, setNextSendIn] = useState<number | null>(null);
  const [nextScheduledAt, setNextScheduledAt] = useState<string | null>(null);
  const [pendingPage, setPendingPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);

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

  const effectiveBrokerId = brokerFilterId || broker?.id || null;

  const applyBrokerFilter = (query: any) => {
    if (effectiveBrokerId) {
      return query.eq("broker_id", effectiveBrokerId);
    }
    return query;
  };

  // Query for pending messages (queued, scheduled, sending, paused_by_system)
  const { data: pendingQueue = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["whatsapp-queue-pending", effectiveBrokerId, pendingPage],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select(`*, lead:leads(id, name), campaign:whatsapp_campaigns(id, name)`)
        .in("status", ["queued", "scheduled", "sending", "paused_by_system"])
        .order("scheduled_at", { ascending: true })
        .range(0, (pendingPage + 1) * PAGE_SIZE - 1);
      
      query = applyBrokerFilter(query);
      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppMessageQueue[];
    },
    enabled: !!effectiveBrokerId || !brokerFilterId,
    refetchInterval: 30000,
  });

  // Query for history messages (sent, failed, cancelled)
  const { data: historyQueue = [], isLoading: historyLoading } = useQuery({
    queryKey: ["whatsapp-queue-history", effectiveBrokerId, historyPage],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select(`*, lead:leads(id, name), campaign:whatsapp_campaigns(id, name)`)
        .in("status", ["sent", "failed", "cancelled"])
        .order("scheduled_at", { ascending: false })
        .range(0, (historyPage + 1) * PAGE_SIZE - 1);
      
      query = applyBrokerFilter(query);
      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppMessageQueue[];
    },
    enabled: !!effectiveBrokerId || !brokerFilterId,
    refetchInterval: 30000,
  });

  // Aggregate counts
  const { data: queuedCount = 0 } = useQuery({
    queryKey: ["whatsapp-queue-count-queued", effectiveBrokerId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "scheduled", "paused_by_system"]);
      query = applyBrokerFilter(query);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: pausedCount = 0 } = useQuery({
    queryKey: ["whatsapp-queue-count-paused", effectiveBrokerId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "paused_by_system");
      query = applyBrokerFilter(query);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

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
      const { data: replies, error } = await supabase
        .from("whatsapp_lead_replies")
        .select("phone")
        .in("campaign_id", campaignIds);

      if (error) throw error;
      const uniquePhones = new Set(replies?.map(r => r.phone) || []);
      return uniquePhones.size;
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
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-pending"] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-history"] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-count-queued", effectiveBrokerId] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-count-sent", effectiveBrokerId] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-count-failed", effectiveBrokerId] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-count-paused", effectiveBrokerId] });
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

  const stats: QueueStats = {
    queued: queuedCount,
    sent: sentCount,
    failed: failedCount,
    replies: repliesCount,
    paused: pausedCount,
  };

  // Calculate next send countdown from pending queue
  useEffect(() => {
    const nextScheduled = pendingQueue.find(
      m => (m.status === "queued" || m.status === "scheduled") && 
           new Date(m.scheduled_at) > new Date()
    );
    
    if (!nextScheduled) {
      setNextSendIn(null);
      setNextScheduledAt(null);
      return;
    }
    
    setNextScheduledAt(nextScheduled.scheduled_at);
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const scheduled = new Date(nextScheduled.scheduled_at).getTime();
      const diff = Math.max(0, Math.floor((scheduled - now) / 1000));
      setNextSendIn(diff);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pendingQueue]);

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
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-pending"] });
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
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-history"] });
    },
    onError: () => {
      toast.error("Erro ao reagendar mensagem");
    },
  });

  const formatNextSendIn = (): string => {
    if (nextSendIn === null) return "--:--";
    const minutes = Math.floor(nextSendIn / 60);
    const seconds = nextSendIn % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const hasMorePending = pendingQueue.length === (pendingPage + 1) * PAGE_SIZE;
  const hasMoreHistory = historyQueue.length === (historyPage + 1) * PAGE_SIZE;
  const allPaused = pendingQueue.length > 0 && pendingQueue.every(m => m.status === "paused_by_system");

  return {
    pendingQueue,
    historyQueue,
    stats,
    isLoading: pendingLoading || historyLoading,
    nextSendIn,
    nextScheduledAt,
    formatNextSendIn,
    cancelMessage: cancelMessageMutation.mutateAsync,
    retryMessage: retryMessageMutation.mutateAsync,
    loadMorePending: () => setPendingPage(p => p + 1),
    loadMoreHistory: () => setHistoryPage(p => p + 1),
    hasMorePending,
    hasMoreHistory,
    allPaused,
  };
}
