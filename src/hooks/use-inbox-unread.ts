import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useInboxUnread() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get broker_id for this user
    const { data: broker } = await supabase
      .from("brokers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let query = supabase
      .from("conversations")
      .select("unread_count")
      .gt("unread_count", 0)
      .eq("is_archived", false);

    if (broker) {
      query = query.eq("broker_id", broker.id);
    }

    const { data } = await query;
    const total = data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) ?? 0;
    setUnreadCount(total);
  };

  useEffect(() => {
    fetchUnread();

    const channel = supabase
      .channel("inbox-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { unreadCount };
}
