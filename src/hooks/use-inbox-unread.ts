import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useInboxUnread() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [brokerId, setBrokerId] = useState<string | null>(null);

  // Fetch broker_id once on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("brokers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.id) setBrokerId(data.id);
        });
    });
  }, []);

  useEffect(() => {
    if (brokerId === null) return; // wait until we know the broker

    const fetchUnread = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("unread_count")
        .gt("unread_count", 0)
        .eq("is_archived", false)
        .eq("broker_id", brokerId);
      setUnreadCount(data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) ?? 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`inbox-unread-${brokerId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `broker_id=eq.${brokerId}`,
      }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [brokerId]);

  return { unreadCount };
}
