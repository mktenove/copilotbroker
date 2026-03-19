import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

interface DailyStat {
  id: string;
  broker_id: string;
  date: string;
  sent_count: number;
  failed_count: number;
  reply_count: number;
  optout_count: number;
  error_count: number;
}

interface WeeklyTotals {
  sent: number;
  failed: number;
  replies: number;
  optouts: number;
  errors: number;
}

interface UseWhatsAppStatsReturn {
  dailyStats: DailyStat[];
  weeklyTotals: WeeklyTotals;
  isLoading: boolean;
  refetch: () => void;
}

export function useWhatsAppStats(brokerId?: string): UseWhatsAppStatsReturn {
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: dailyStats = [], isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-daily-stats", brokerId, sevenDaysAgo],
    queryFn: async () => {
      if (!brokerId) return [];

      const { data, error } = await supabase
        .from("whatsapp_daily_stats")
        .select("*")
        .eq("broker_id", brokerId)
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: true });

      if (error) throw error;
      return data as DailyStat[];
    },
    enabled: !!brokerId,
    staleTime: 300_000,
  });

  const weeklyTotals = dailyStats.reduce(
    (acc, stat) => ({
      sent: acc.sent + (stat.sent_count || 0),
      failed: acc.failed + (stat.failed_count || 0),
      replies: acc.replies + (stat.reply_count || 0),
      optouts: acc.optouts + (stat.optout_count || 0),
      errors: acc.errors + (stat.error_count || 0),
    }),
    { sent: 0, failed: 0, replies: 0, optouts: 0, errors: 0 }
  );

  return {
    dailyStats,
    weeklyTotals,
    isLoading,
    refetch,
  };
}

// Hook for admin - all brokers stats
export function useWhatsAppGlobalStats(): {
  allStats: DailyStat[];
  globalTotals: WeeklyTotals;
  isLoading: boolean;
  refetch: () => void;
} {
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: allStats = [], isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-global-stats", sevenDaysAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_daily_stats")
        .select("*")
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: true });

      if (error) throw error;
      return data as DailyStat[];
    },
    staleTime: 300_000,
  });

  const globalTotals = allStats.reduce(
    (acc, stat) => ({
      sent: acc.sent + (stat.sent_count || 0),
      failed: acc.failed + (stat.failed_count || 0),
      replies: acc.replies + (stat.reply_count || 0),
      optouts: acc.optouts + (stat.optout_count || 0),
      errors: acc.errors + (stat.error_count || 0),
    }),
    { sent: 0, failed: 0, replies: 0, optouts: 0, errors: 0 }
  );

  return {
    allStats,
    globalTotals,
    isLoading,
    refetch,
  };
}
