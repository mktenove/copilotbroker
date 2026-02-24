import { useState, useEffect, useCallback, useRef } from "react";
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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async (userId?: string) => {
    const uid = userId || currentUserIdRef.current;
    if (!uid) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", uid)
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

  const setupRealtime = useCallback((userId: string) => {
    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
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
          filter: `user_id=eq.${userId}`,
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
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Listen for auth state changes - THIS is the key fix
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const userId = session?.user?.id || null;
        const previousUserId = currentUserIdRef.current;

        if (userId && userId !== previousUserId) {
          // New session or different user
          currentUserIdRef.current = userId;
          setIsLoading(true);
          fetchNotifications(userId);
          setupRealtime(userId);
        } else if (!userId && previousUserId) {
          // Logged out
          currentUserIdRef.current = null;
          setNotifications([]);
          setIsLoading(false);
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        }
      }
    );

    // Also do an initial fetch with current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        currentUserIdRef.current = session.user.id;
        fetchNotifications(session.user.id);
        setupRealtime(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchNotifications, setupRealtime]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await (supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("id", notificationId) as any);

      if (error) throw error;

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
    const uid = currentUserIdRef.current;
    if (!uid) return;

    try {
      const { error } = await (supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("user_id", uid)
        .eq("is_read", false) as any);

      if (error) throw error;

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
    refresh: () => fetchNotifications(),
  };
}
