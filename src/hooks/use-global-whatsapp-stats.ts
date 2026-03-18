import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationRecord {
  id: string;
  notes: string | null;
  created_at: string;
  lead_id: string;
}

interface DailyStat {
  date: string;
  sent: number;
  failed: number;
}

interface RecentError {
  id: string;
  notes: string;
  created_at: string;
  leadName: string | null;
}

interface GlobalWhatsAppTotals {
  total: number;
  sent: number;
  failed: number;
  successRate: number;
}

function isSuccess(notes: string | null): boolean {
  if (!notes) return false;
  return notes.startsWith("✅");
}

function isFailure(notes: string | null): boolean {
  if (!notes) return true;
  return notes.startsWith("❌");
}

function extractErrorMessage(notes: string): string {
  // Remove prefix "❌ Falha ao enviar para Nome: " or "❌ Falha ao enviar: "
  const match = notes.match(/❌\s*Falha ao enviar(?:\s*para\s*[^:]+)?:\s*(.*)/);
  if (match) {
    const raw = match[1].trim();
    // Try to parse JSON error
    try {
      const parsed = JSON.parse(raw);
      return parsed.message || raw;
    } catch {
      return raw.replace(/^"(.*)"$/, "$1");
    }
  }
  return notes.replace("❌ ", "");
}

function extractLeadName(notes: string): string | null {
  const match = notes.match(/(?:enviada|enviar)\s+para\s+([^(:\n]+)/);
  return match ? match[1].trim() : null;
}

export function useGlobalWhatsAppStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["global-whatsapp-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: records, error } = await supabase
        .from("lead_interactions")
        .select("id, notes, created_at, lead_id")
        .eq("channel", "whatsapp")
        .eq("interaction_type", "notification")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (records || []) as NotificationRecord[];
    },
    refetchInterval: 300000,
  });

  const records = data || [];

  // Totals
  const sent = records.filter((r) => isSuccess(r.notes)).length;
  const failed = records.filter((r) => isFailure(r.notes)).length;
  const total = records.length;
  const successRate = total > 0 ? Math.round((sent / total) * 100) : 100;

  const totals: GlobalWhatsAppTotals = { total, sent, failed, successRate };

  // Daily stats (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 6);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return format(date, "yyyy-MM-dd");
  });

  const recentRecords = records.filter(
    (r) => new Date(r.created_at) >= sevenDaysAgo
  );

  const dailyMap = new Map<string, { sent: number; failed: number }>();
  last7Days.forEach((d) => dailyMap.set(d, { sent: 0, failed: 0 }));

  recentRecords.forEach((r) => {
    const day = format(new Date(r.created_at), "yyyy-MM-dd");
    const entry = dailyMap.get(day);
    if (entry) {
      if (isSuccess(r.notes)) entry.sent++;
      else entry.failed++;
    }
  });

  const dailyStats: DailyStat[] = last7Days.map((date) => ({
    date,
    sent: dailyMap.get(date)?.sent || 0,
    failed: dailyMap.get(date)?.failed || 0,
  }));

  // Recent errors (last 5)
  const recentErrors: RecentError[] = records
    .filter((r) => isFailure(r.notes))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      notes: r.notes || "Erro desconhecido",
      created_at: r.created_at,
      leadName: extractLeadName(r.notes || ""),
    }));

  return {
    totals,
    dailyStats,
    recentErrors,
    isLoading,
    extractErrorMessage,
  };
}
