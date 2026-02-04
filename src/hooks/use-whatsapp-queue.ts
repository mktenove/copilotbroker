import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate stats
  const stats: QueueStats = {
    queued: queue.filter(m => m.status === "queued" || m.status === "scheduled").length,
    sent: queue.filter(m => m.status === "sent").length,
    failed: queue.filter(m => m.status === "failed").length,
    replies: 0, // This would come from a separate table or campaign stats
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
