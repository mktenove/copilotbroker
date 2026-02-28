import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, TrendingUp, Users, MousePointerClick, RefreshCw, Eye, Calendar,
  Target, Award, Megaphone, Building2, ArrowDownRight, Clock, UserX
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, FunnelChart, Funnel, LabelList,
} from "recharts";
import { getOriginDisplayLabel, getOriginType, OriginType, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PageView {
  id: string;
  page_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  session_id: string | null;
  created_at: string;
  project_id: string | null;
}

interface Lead {
  id: string;
  source: string;
  lead_origin: string | null;
  lead_origin_detail: string | null;
  created_at: string;
  status: LeadStatus;
  broker_id: string | null;
  project_id: string | null;
}

interface Interaction {
  id: string;
  lead_id: string;
  interaction_type: string;
  old_status: LeadStatus | null;
  new_status: LeadStatus | null;
  created_at: string;
}

interface Broker {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface DailyStats {
  date: string;
  views: number;
  leads: number;
}

interface OriginStats {
  name: string;
  displayName: string;
  leads: number;
  type: OriginType;
  details: { name: string; count: number }[];
}

interface SourceStats {
  name: string;
  leads: number;
  percentage: number;
}

interface PageStats {
  path: string;
  views: number;
  percentage: number;
}

interface BrokerPerformance {
  id: string;
  name: string;
  totalLeads: number;
  registered: number;
  conversionRate: number;
  avgResponseHours: number;
}

interface FunnelData {
  status: LeadStatus;
  name: string;
  value: number;
  fill: string;
}

const ORIGIN_COLORS: Record<OriginType, string> = {
  paid: "#9333ea", organic: "#22c55e", referral: "#3b82f6", manual: "#f59e0b", unknown: "#64748b"
};

const FUNNEL_COLORS: Record<LeadStatus, string> = {
  new: "#3b82f6", info_sent: "#8b5cf6", awaiting_docs: "#f59e0b", scheduling: "#f97316",
  docs_received: "#22c55e", registered: "#10b981", inactive: "#ef4444"
};

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState(30);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [drillDownOrigin, setDrillDownOrigin] = useState<string | null>(null);

  const startDate = startOfDay(subDays(new Date(), dateRange)).toISOString();
  const endDate = endOfDay(new Date()).toISOString();

  // React Query: Projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["analytics-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, slug").eq("is_active", true).order("name");
      return (data || []) as Project[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // React Query: All analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["analytics-data", dateRange, selectedProject],
    queryFn: async () => {
      let viewsQuery = supabase
        .from("page_views")
        .select("id, page_path, utm_source, utm_medium, utm_campaign, referrer, session_id, created_at, project_id")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      let leadsQuery = supabase
        .from("leads")
        .select("id, source, lead_origin, lead_origin_detail, created_at, status, broker_id, project_id")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      let interactionsQuery = supabase
        .from("lead_interactions")
        .select("id, lead_id, interaction_type, old_status, new_status, created_at")
        .eq("interaction_type", "status_change")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (selectedProject !== "all") {
        viewsQuery = viewsQuery.eq("project_id", selectedProject);
        leadsQuery = leadsQuery.eq("project_id", selectedProject);
      }

      const [viewsResult, leadsResult, interactionsResult, brokersResult] = await Promise.all([
        viewsQuery,
        leadsQuery,
        interactionsQuery,
        supabase.from("brokers").select("id, name").eq("is_active", true)
      ]);

      return {
        pageViews: (viewsResult.data || []) as PageView[],
        leads: (leadsResult.data || []) as Lead[],
        interactions: (interactionsResult.data || []) as Interaction[],
        brokers: (brokersResult.data || []) as Broker[],
      };
    },
    staleTime: 30 * 1000,
  });

  const pageViews = analyticsData?.pageViews || [];
  const leads = analyticsData?.leads || [];
  const interactions = analyticsData?.interactions || [];
  const brokers = analyticsData?.brokers || [];

  const uniqueSessions = new Set(pageViews.map((pv) => pv.session_id)).size;

  const dailyStats: DailyStats[] = useMemo(() => {
    const stats: DailyStats[] = [];
    for (let i = dateRange - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const displayDate = format(date, "dd/MM", { locale: ptBR });
      const dayViews = pageViews.filter((pv) => format(new Date(pv.created_at), "yyyy-MM-dd") === dateStr).length;
      const dayLeads = leads.filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === dateStr).length;
      stats.push({ date: displayDate, views: dayViews, leads: dayLeads });
    }
    return stats;
  }, [pageViews, leads, dateRange]);

  const funnelData: FunnelData[] = useMemo(() => {
    const statusOrder: LeadStatus[] = ['new', 'info_sent', 'docs_received', 'registered'];
    return statusOrder.map(status => ({
      status, name: STATUS_CONFIG[status]?.label || status,
      value: leads.filter(l => l.status === status).length, fill: FUNNEL_COLORS[status]
    }));
  }, [leads]);

  const inactivatedLeads = leads.filter(l => l.status === 'inactive').length;
  const inactivationRate = leads.length > 0 ? (inactivatedLeads / leads.length) * 100 : 0;

  const brokerPerformance: BrokerPerformance[] = useMemo(() => {
    return brokers.map(broker => {
      const brokerLeads = leads.filter(l => l.broker_id === broker.id);
      const registered = brokerLeads.filter(l => l.status === 'registered').length;
      const leadIds = new Set(brokerLeads.map(l => l.id));
      const brokerInteractions = interactions.filter(i => leadIds.has(i.lead_id) && i.old_status === 'new' && i.new_status === 'info_sent');
      let avgResponseHours = 0;
      if (brokerInteractions.length > 0) {
        const responseTimes = brokerInteractions.map(i => {
          const lead = brokerLeads.find(l => l.id === i.lead_id);
          return lead ? differenceInHours(new Date(i.created_at), new Date(lead.created_at)) : 0;
        });
        avgResponseHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
      return { id: broker.id, name: broker.name, totalLeads: brokerLeads.length, registered, conversionRate: brokerLeads.length > 0 ? (registered / brokerLeads.length) * 100 : 0, avgResponseHours };
    }).filter(b => b.totalLeads > 0).sort((a, b) => b.conversionRate - a.conversionRate);
  }, [brokers, leads, interactions]);

  const originStats: OriginStats[] = useMemo(() => {
    const originMap = new Map<string, { count: number; details: Map<string, number> }>();
    leads.forEach((lead) => {
      const origin = lead.lead_origin || "unknown";
      if (!originMap.has(origin)) originMap.set(origin, { count: 0, details: new Map() });
      const entry = originMap.get(origin)!;
      entry.count += 1;
      const detail = lead.lead_origin_detail || "(sem detalhe)";
      entry.details.set(detail, (entry.details.get(detail) || 0) + 1);
    });
    return Array.from(originMap.entries())
      .map(([name, data]) => ({
        name, displayName: getOriginDisplayLabel(name === "unknown" ? null : name),
        leads: data.count, type: getOriginType(name === "unknown" ? null : name),
        details: Array.from(data.details.entries()).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.leads - a.leads).slice(0, 8);
  }, [leads]);

  const drillDownData = useMemo(() => {
    if (!drillDownOrigin) return null;
    return originStats.find(o => o.name === drillDownOrigin) || null;
  }, [drillDownOrigin, originStats]);

  const sourceStats: SourceStats[] = useMemo(() => {
    const sourceMap = new Map<string, number>();
    leads.forEach((lead) => {
      const source = lead.source === "enove" ? "Direto" : lead.source;
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    return Array.from(sourceMap.entries())
      .map(([name, count]) => ({ name, leads: count, percentage: leads.length > 0 ? (count / leads.length) * 100 : 0 }))
      .sort((a, b) => b.leads - a.leads);
  }, [leads]);

  const directLeads = sourceStats.find(s => s.name === "Direto")?.leads || 0;
  const brokerLeads = leads.length - directLeads - inactivatedLeads;
  const distributionData = [
    { name: "Direto", value: directLeads },
    { name: "Corretores", value: brokerLeads },
  ].filter(d => d.value > 0);

  const pageStats: PageStats[] = useMemo(() => {
    const pageMap = new Map<string, number>();
    pageViews.forEach((pv) => {
      const current = pageMap.get(pv.page_path) || 0;
      pageMap.set(pv.page_path, current + 1);
    });
    const totalViews = pageViews.length;
    return Array.from(pageMap.entries())
      .map(([path, views]) => ({ path: formatPagePath(path), views, percentage: totalViews > 0 ? (views / totalViews) * 100 : 0 }))
      .sort((a, b) => b.views - a.views).slice(0, 5);
  }, [pageViews]);

  const totalViews = pageViews.length;
  const conversionRate = totalViews > 0 ? (leads.length / totalViews) * 100 : 0;
  const bestChannel = originStats.length > 0 ? originStats[0] : null;
  const topBroker = brokerPerformance.length > 0 ? brokerPerformance[0] : null;

  const handleRefresh = () => {
    // React Query will handle refetching
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-white">
          Dashboard de Analytics
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[160px] bg-[#1e1e22] border-[#2a2a2e] text-white">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 bg-[#1e1e22] border border-[#2a2a2e] rounded-lg text-sm text-white"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[#1e1e22] text-[#FFFF00] border border-[#2a2a2e] rounded-lg hover:bg-[#2a2a2e] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Eye} label="Visualizações" value={totalViews} isLoading={isLoading} />
        <StatCard icon={Users} label="Sessões" value={uniqueSessions} isLoading={isLoading} />
        <StatCard icon={MousePointerClick} label="Leads" value={leads.length} isLoading={isLoading} />
        <StatCard icon={TrendingUp} label="Conversão" value={`${conversionRate.toFixed(1)}%`} isLoading={isLoading} />
        <StatCard icon={Target} label="Melhor Canal" value={bestChannel?.displayName || "-"} isLoading={isLoading} highlight />
        <StatCard icon={Award} label="Top Corretor" value={topBroker?.name || "-"} isLoading={isLoading} highlight />
      </div>

      {/* Daily Chart */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#FFFF00]" />
          Visitas e Leads por Dia
        </h3>
        <div className="h-[250px] sm:h-[300px]">
          {isLoading ? (
            <LoadingChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={{ stroke: "hsl(var(--border))" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: "hsl(var(--primary))" }} name="Visitas" />
                <Line type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: "#22c55e" }} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Funnel + Broker Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Funnel */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4 text-[#FFFF00]" />
            Funil de Conversão
          </h3>
          <div className="space-y-3">
            {funnelData.map((stage) => (
              <div key={stage.status}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{stage.name}</span>
                  <span className="text-white font-medium">{stage.value}</span>
                </div>
                <div className="h-2 bg-[#2a2a2e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${leads.length > 0 ? (stage.value / leads.length) * 100 : 0}%`, backgroundColor: stage.fill }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Inactivation rate */}
          <div className="mt-4 pt-4 border-t border-[#2a2a2e]">
            <div className="flex items-center gap-2 text-sm">
              <UserX className="w-4 h-4 text-red-400" />
              <span className="text-slate-400">Inativados:</span>
              <span className="text-red-400 font-medium">{inactivatedLeads} ({inactivationRate.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Broker Performance */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#FFFF00]" />
            Performance por Corretor
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {brokerPerformance.length === 0 ? (
              <p className="text-slate-500 text-sm">Sem dados no período</p>
            ) : (
              brokerPerformance.map((broker, i) => (
                <div key={broker.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2a2a2e] transition-colors">
                  <span className="text-xs font-medium text-slate-500 w-5">{i + 1}º</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{broker.name}</p>
                    <p className="text-xs text-slate-400">{broker.totalLeads} leads · {broker.registered} cadastros</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#FFFF00]">{broker.conversionRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {broker.avgResponseHours.toFixed(0)}h
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Origins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Origin Chart */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#FFFF00]" />
            Leads por Origem
          </h3>
          {originStats.length === 0 ? (
            <p className="text-slate-500 text-sm">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {originStats.map((origin) => (
                <button
                  key={origin.name}
                  onClick={() => setDrillDownOrigin(drillDownOrigin === origin.name ? null : origin.name)}
                  className={cn("w-full text-left p-2 rounded-lg transition-colors", drillDownOrigin === origin.name ? "bg-[#2a2a2e]" : "hover:bg-[#2a2a2e]/50")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[origin.type] }} />
                      <span className="text-sm text-slate-200">{origin.displayName}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{origin.leads}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-[#2a2a2e] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${leads.length > 0 ? (origin.leads / leads.length) * 100 : 0}%`, backgroundColor: ORIGIN_COLORS[origin.type] }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Drill-down or Distribution */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          {drillDownData ? (
            <>
              <h3 className="text-sm sm:text-base font-medium text-white mb-4">
                Detalhe: {drillDownData.displayName}
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {drillDownData.details.map((d) => (
                  <div key={d.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2a2a2e]">
                    <span className="text-sm text-slate-300 truncate max-w-[200px]">{d.name}</span>
                    <span className="text-sm font-medium text-white">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FFFF00]" />
                Distribuição Enove vs Corretores
              </h3>
              {distributionData.length === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "#22c55e" } />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pages + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Pages */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#FFFF00]" />
            Páginas Mais Visitadas
          </h3>
          <div className="space-y-2">
            {pageStats.map((page) => (
              <div key={page.path} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2a2a2e]">
                <span className="text-sm text-slate-300 truncate max-w-[200px]">{page.path}</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">{page.views}</span>
                  <span className="text-xs text-slate-500 ml-2">({page.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Stats */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#FFFF00]" />
            Fontes de Leads
          </h3>
          <div className="space-y-2">
            {sourceStats.map((source) => (
              <div key={source.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2a2a2e]">
                <span className="text-sm text-slate-300">{source.name}</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">{source.leads}</span>
                  <span className="text-xs text-slate-500 ml-2">({source.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components
const StatCard = ({ icon: Icon, label, value, isLoading, highlight }: any) => (
  <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-3 sm:p-4">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-[#FFFF00]" />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
    {isLoading ? (
      <div className="h-6 w-16 bg-[#2a2a2e] rounded animate-pulse" />
    ) : (
      <p className={cn("text-base sm:text-lg font-bold truncate", highlight ? "text-[#FFFF00]" : "text-white")}>
        {value}
      </p>
    )}
  </div>
);

const LoadingChart = () => (
  <div className="flex items-center justify-center h-full">
    <RefreshCw className="w-6 h-6 animate-spin text-[#FFFF00]" />
  </div>
);

const formatPagePath = (path: string): string => {
  if (path === "/" || path === "") return "Home";
  const cleanPath = path.replace(/^\//, "").replace(/\/$/, "");
  const segments = cleanPath.split("/");
  const last = segments[segments.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
};

export default AnalyticsDashboard;
