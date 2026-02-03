import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrokerSession {
  id: string;
  broker_id: string;
  logged_in_at: string;
  login_method: string;
  user_agent: string | null;
}

interface BrokerActivityLog {
  id: string;
  broker_id: string;
  activity_type: string;
  lead_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  lead?: {
    name: string;
  } | null;
}

interface BrokerActivitySummary {
  totalLogins: number;
  daysActive: number;
  lastLogin: string | null;
  leadsHandled: number;
  recentActivities: BrokerActivityLog[];
  recentSessions: BrokerSession[];
}

export function useBrokerActivity(brokerId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<BrokerActivitySummary | null>(null);
  const [sessions, setSessions] = useState<BrokerSession[]>([]);
  const [activities, setActivities] = useState<BrokerActivityLog[]>([]);

  const fetchSummary = useCallback(async () => {
    if (!brokerId) return;

    setIsLoading(true);
    try {
      // Buscar sessões do mês atual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from("broker_sessions")
        .select("*")
        .eq("broker_id", brokerId)
        .gte("logged_in_at", startOfMonth.toISOString())
        .order("logged_in_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Buscar atividades recentes (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("broker_activity_logs")
        .select(`
          *,
          lead:leads(name)
        `)
        .eq("broker_id", brokerId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;

      // Buscar quantidade de leads atendidos (interações)
      const { count: leadsCount } = await supabase
        .from("lead_interactions")
        .select("lead_id", { count: "exact", head: true })
        .eq("broker_id", brokerId);

      // Calcular dias ativos (dias únicos com sessões)
      const uniqueDays = new Set(
        (sessionsData || []).map((s: BrokerSession) =>
          new Date(s.logged_in_at).toDateString()
        )
      );

      setSummary({
        totalLogins: sessionsData?.length || 0,
        daysActive: uniqueDays.size,
        lastLogin: sessionsData?.[0]?.logged_in_at || null,
        leadsHandled: leadsCount || 0,
        recentActivities: (activitiesData || []).slice(0, 10) as BrokerActivityLog[],
        recentSessions: (sessionsData || []).slice(0, 10) as BrokerSession[],
      });
    } catch (error) {
      console.error("Erro ao buscar resumo de atividades:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  const fetchSessions = useCallback(async (limit = 50) => {
    if (!brokerId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("broker_sessions")
        .select("*")
        .eq("broker_id", brokerId)
        .order("logged_in_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setSessions((data || []) as BrokerSession[]);
    } catch (error) {
      console.error("Erro ao buscar sessões:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  const fetchActivities = useCallback(async (limit = 50) => {
    if (!brokerId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("broker_activity_logs")
        .select(`
          *,
          lead:leads(name)
        `)
        .eq("broker_id", brokerId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActivities((data || []) as BrokerActivityLog[]);
    } catch (error) {
      console.error("Erro ao buscar atividades:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brokerId]);

  return {
    summary,
    sessions,
    activities,
    isLoading,
    fetchSummary,
    fetchSessions,
    fetchActivities,
  };
}

/**
 * Hook para buscar o último acesso de múltiplos corretores de uma vez.
 */
export function useBrokersLastAccess() {
  const [lastAccessMap, setLastAccessMap] = useState<Record<string, string>>({});
  const [leadsCountMap, setLeadsCountMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchLastAccess = useCallback(async (brokerIds: string[]) => {
    if (brokerIds.length === 0) return;

    setIsLoading(true);
    try {
      // Buscar a sessão mais recente de cada broker
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("broker_sessions")
        .select("broker_id, logged_in_at")
        .in("broker_id", brokerIds)
        .order("logged_in_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Agrupar por broker_id, pegando só o mais recente
      const accessMap: Record<string, string> = {};
      (sessionsData || []).forEach((session: { broker_id: string; logged_in_at: string }) => {
        if (!accessMap[session.broker_id]) {
          accessMap[session.broker_id] = session.logged_in_at;
        }
      });
      setLastAccessMap(accessMap);

      // Buscar contagem de leads por broker
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("broker_id")
        .in("broker_id", brokerIds);

      if (leadsError) throw leadsError;

      // Contar leads por broker
      const countMap: Record<string, number> = {};
      (leadsData || []).forEach((lead: { broker_id: string | null }) => {
        if (lead.broker_id) {
          countMap[lead.broker_id] = (countMap[lead.broker_id] || 0) + 1;
        }
      });
      setLeadsCountMap(countMap);
    } catch (error) {
      console.error("Erro ao buscar últimos acessos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    lastAccessMap,
    leadsCountMap,
    isLoading,
    fetchLastAccess,
  };
}
