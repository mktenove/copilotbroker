import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead, LeadStatus } from "@/types/crm";
import { useMemo } from "react";

const PAGE_SIZE = 30;

const KANBAN_SELECT = `
  id, name, whatsapp, email, created_at, source, status,
  lead_origin, broker_id, project_id, roleta_id,
  status_distribuicao, comparecimento, last_interaction_at,
  auto_first_message_sent, data_agendamento,
  broker:brokers!leads_broker_id_fkey(id, name, slug),
  project:projects(id, name),
  attribution:lead_attribution(landing_page)
`;

export interface KanbanColumnFilters {
  brokerId?: string | null;
  isAdmin?: boolean;
  projectId?: string | null;
  selectedBroker?: string;
  selectedOrigins?: string[];
  searchTerm?: string;
}

function applyFilters(query: any, filters: KanbanColumnFilters) {
  if (!filters.isAdmin && filters.brokerId) {
    query = query.eq("broker_id", filters.brokerId);
  }
  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters.selectedBroker && filters.selectedBroker !== "all") {
    if (filters.selectedBroker === "direto") {
      query = query.is("broker_id", null);
    } else {
      query = query.eq("broker_id", filters.selectedBroker);
    }
  }
  if (filters.selectedOrigins && filters.selectedOrigins.length > 0) {
    const hasNoOrigin = filters.selectedOrigins.includes("sem_origem");
    const origins = filters.selectedOrigins.filter((o: string) => o !== "sem_origem");
    if (hasNoOrigin && origins.length > 0) {
      query = query.or(`lead_origin.is.null,lead_origin.in.(${origins.join(",")})`);
    } else if (hasNoOrigin) {
      query = query.is("lead_origin", null);
    } else if (origins.length > 0) {
      query = query.in("lead_origin", origins);
    }
  }
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim().replace(/[(),."'\\%_]/g, "");
    if (term) {
      query = query.or(`name.ilike.%${term}%,whatsapp.ilike.%${term}%`);
    }
  }
  return query;
}

export function useKanbanColumn(status: LeadStatus, filters: KanbanColumnFilters) {
  const filtersKey = useMemo(() => [
    filters.brokerId, filters.isAdmin, filters.projectId,
    filters.selectedBroker,
    JSON.stringify(filters.selectedOrigins || []),
    filters.searchTerm || "",
  ], [filters.brokerId, filters.isAdmin, filters.projectId, filters.selectedBroker, filters.selectedOrigins, filters.searchTerm]);

  const queryKey = ["kanban-column", status, ...filtersKey];
  const countKey = ["kanban-count", status, ...filtersKey];

  const { data: totalCount = 0 } = useQuery({
    queryKey: countKey,
    queryFn: async () => {
      let query = supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", status);
      query = applyFilters(query, filters);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30_000,
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("leads")
        .select(KANBAN_SELECT)
        .eq("status", status)
        .order("last_interaction_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      query = applyFilters(query, filters);
      const { data, error } = await query;
      if (error) throw error;
      return ((data || []) as any[]).map((lead: any) => ({
        ...lead,
        attribution: Array.isArray(lead.attribution) && lead.attribution.length > 0
          ? lead.attribution[0]
          : lead.attribution,
      })) as unknown as CRMLead[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((acc, page) => acc + page.length, 0);
    },
    initialPageParam: 0,
    staleTime: 30_000,
  });

  const leads = useMemo(() => data?.pages.flat() ?? [], [data]);

  return {
    leads,
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
  };
}
