import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useInboxUnread() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let brokerId: string | null = null;

    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!brokerId) {
        const { data: broker } = await supabase
          .from("brokers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        brokerId = broker?.id ?? null;
      }

      let query = supabase
        .from("conversations")
        .select("unread_count")
        .gt("unread_count", 0)
        .eq("is_archived", false);

      if (brokerId) query = query.eq("broker_id", brokerId);

      const { data } = await query;
      setUnreadCount(data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) ?? 0);
    };

    fetchUnread().then(() => {
      // Subscribe with filter once brokerId is known
      const config: any = { event: "*", schema: "public", table: "conversations" };
      if (brokerId) config.filter = `broker_id=eq.${brokerId}`;

      supabase
        .channel(`inbox-unread-${brokerId ?? "all"}`)
        .on("postgres_changes", config, fetchUnread)
        .subscribe();
    });

    return () => {
      supabase.removeChannel(
        supabase.channel(`inbox-unread-${brokerId ?? "all"}`)
      );
    };
  }, []);

  return { unreadCount };
}
