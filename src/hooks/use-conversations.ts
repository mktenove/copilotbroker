import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  broker_id: string;
  lead_id: string | null;
  phone: string;
  phone_normalized: string;
  status: string;
  ai_mode: string;
  is_archived: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  unread_count: number;
  opportunity_score: number;
  temperature: number;
  copilot_suggestions_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: { id: string; name: string; status: string; project_id: string | null; notes: string | null; lead_origin: string | null } | null;
  project?: { id: string; name: string } | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  direction: string;
  content: string;
  message_type: string;
  sender_name: string | null;
  sent_by: string;
  status: string;
  uazapi_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UseConversationsOptions {
  brokerId?: string;
  statusFilter?: string;
  search?: string;
  isArchived?: boolean;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = useCallback(async () => {
    try {
      let query = supabase
        .from("conversations")
        .select(`
          *,
          lead:leads!conversations_lead_id_fkey(id, name, status, project_id, notes, lead_origin)
        `)
        .eq("is_archived", options.isArchived ?? false)
        .order("last_message_at", { ascending: false });

      if (options.brokerId) {
        query = query.eq("broker_id", options.brokerId);
      }
      if (options.statusFilter && options.statusFilter !== "all") {
        query = query.eq("status", options.statusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      let filtered = (data || []) as unknown as Conversation[];

      // Client-side search
      if (options.search) {
        const s = options.search.toLowerCase();
        filtered = filtered.filter(c =>
          c.phone.includes(s) ||
          c.phone_normalized.includes(s) ||
          (c.lead as any)?.name?.toLowerCase().includes(s) ||
          c.last_message_preview?.toLowerCase().includes(s)
        );
      }

      setConversations(filtered);
      setTotalUnread(filtered.reduce((acc, c) => acc + (c.unread_count || 0), 0));
    } catch (error) {
      console.error("Erro ao buscar conversas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [options.brokerId, options.statusFilter, options.search, options.isArchived]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  const markAsRead = useCallback(async (conversationId: string) => {
    await supabase
      .from("conversations")
      .update({ unread_count: 0, status: "attending" } as any)
      .eq("id", conversationId);
  }, []);

  const archiveConversation = useCallback(async (conversationId: string) => {
    await supabase
      .from("conversations")
      .update({ is_archived: true, status: "closed" } as any)
      .eq("id", conversationId);
    toast.success("Conversa arquivada");
  }, []);

  const updateAiMode = useCallback(async (conversationId: string, mode: string) => {
    await supabase
      .from("conversations")
      .update({ ai_mode: mode } as any)
      .eq("id", conversationId);
    toast.success(mode === "ai_active" ? "Piloto Automático ativado" : "Modo Copiloto ativado");
  }, []);

  return {
    conversations,
    isLoading,
    totalUnread,
    fetchConversations,
    markAsRead,
    archiveConversation,
    updateAiMode,
  };
}

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      setMessages((data || []) as unknown as ConversationMessage[]);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime for new messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conv-messages-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "conversation_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as unknown as ConversationMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, sentBy = "human") => {
    if (!conversationId) return null;
    const { data, error } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        direction: "outbound",
        content,
        sent_by: sentBy,
        message_type: "text",
        status: "sent",
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao enviar mensagem");
      console.error(error);
      return null;
    }
    return data;
  }, [conversationId]);

  return { messages, isLoading, fetchMessages, sendMessage };
}
