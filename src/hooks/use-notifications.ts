import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  user_id: string;
  type: "new_lead" | "stale_lead" | "status_change" | "roleta_lead";
  title: string;
  message: string;
  lead_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await (supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50) as any);

      if (error) {
        console.error("Erro ao buscar notificações:", error);
        return;
      }

      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      channel = supabase
        .channel("notifications-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedNotification.id ? updatedNotification : n
              )
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const deletedId = payload.old.id;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await (supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("id", notificationId) as any);

      if (error) throw error;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await (supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false) as any);

      if (error) throw error;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await (supabase
        .from("notifications" as any)
        .delete()
        .eq("id", notificationId) as any);

      if (error) throw error;

      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
