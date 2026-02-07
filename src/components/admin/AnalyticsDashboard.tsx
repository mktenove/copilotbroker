import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MousePointerClick,
  RefreshCw,
  Eye,
  Calendar,
  Target,
  Award,
  Megaphone,
  Building2,
  ArrowDownRight,
  Clock,
  UserX
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { getOriginDisplayLabel, getOriginType, OriginType, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Cores por tipo de origem
const ORIGIN_COLORS: Record<OriginType, string> = {
  paid: "#9333ea",
  organic: "#22c55e", 
  referral: "#3b82f6",
  manual: "#f59e0b",
  unknown: "#64748b"
};

const FUNNEL_COLORS: Record<LeadStatus, string> = {
  new: "#3b82f6",
  info_sent: "#8b5cf6",
  awaiting_docs: "#f59e0b",
  docs_received: "#22c55e",
  registered: "#10b981",
  inactive: "#ef4444"
};

const AnalyticsDashboard = () => {
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [selectedProject, setSelectedProject] = useState<string>("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name");
    
    if (data) setProjects(data);
  };

  const fetchData = async () => {
    setIsLoading(true);
    const startDate = startOfDay(subDays(new Date(), dateRange)).toISOString();
    const endDate = endOfDay(new Date()).toISOString();

    try {
      // Build queries with optional project filter
      let viewsQuery = supabase
        .from("page_views")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      let leadsQuery = supabase
        .from("leads")
        .select("id, source, lead_origin, created_at, status, broker_id, project_id")
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

      if (viewsResult.data) setPageViews(viewsResult.data as PageView[]);
      if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
      if (interactionsResult.data) setInteractions(interactionsResult.data as Interaction[]);
      if (brokersResult.data) setBrokers(brokersResult.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate unique sessions
  const uniqueSessions = new Set(pageViews.map((pv) => pv.session_id)).size;

  // Calculate daily stats
  const dailyStats: DailyStats[] = useMemo(() => {
    const stats: DailyStats[] = [];
    for (let i = dateRange - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const displayDate = format(date, "dd/MM", { locale: ptBR });
      
      const dayViews = pageViews.filter(
        (pv) => format(new Date(pv.created_at), "yyyy-MM-dd") === dateStr
      ).length;
      
      const dayLeads = leads.filter(
        (l) => format(new Date(l.created_at), "yyyy-MM-dd") === dateStr
      ).length;

      stats.push({
        date: displayDate,
        views: dayViews,
        leads: dayLeads,
      });
    }
    return stats;
  }, [pageViews, leads, dateRange]);

  // Funnel data
  const funnelData: FunnelData[] = useMemo(() => {
    const statusOrder: LeadStatus[] = ['new', 'info_sent', 'docs_received', 'registered'];
    return statusOrder.map(status => ({
      status,
      name: STATUS_CONFIG[status]?.label || status,
      value: leads.filter(l => l.status === status).length,
      fill: FUNNEL_COLORS[status]
    }));
  }, [leads]);

  // Inactivation rate
  const inactivatedLeads = leads.filter(l => l.status === 'inactive').length;
  const inactivationRate = leads.length > 0 ? (inactivatedLeads / leads.length) * 100 : 0;

  // Calculate broker performance
  const brokerPerformance: BrokerPerformance[] = useMemo(() => {
    return brokers.map(broker => {
      const brokerLeads = leads.filter(l => l.broker_id === broker.id);
      const registered = brokerLeads.filter(l => l.status === 'registered').length;
      
      // Calculate average first response time (from new to info_sent)
      const leadIds = new Set(brokerLeads.map(l => l.id));
      const brokerInteractions = interactions.filter(i => 
        leadIds.has(i.lead_id) && 
        i.old_status === 'new' && 
        i.new_status === 'info_sent'
      );
      
      let avgResponseHours = 0;
      if (brokerInteractions.length > 0) {
        const responseTimes = brokerInteractions.map(i => {
          const lead = brokerLeads.find(l => l.id === i.lead_id);
          if (lead) {
            return differenceInHours(new Date(i.created_at), new Date(lead.created_at));
          }
          return 0;
        });
        avgResponseHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }

      return {
        id: broker.id,
        name: broker.name,
        totalLeads: brokerLeads.length,
        registered,
        conversionRate: brokerLeads.length > 0 ? (registered / brokerLeads.length) * 100 : 0,
        avgResponseHours
      };
    }).filter(b => b.totalLeads > 0).sort((a, b) => b.conversionRate - a.conversionRate);
  }, [brokers, leads, interactions]);

  // Calculate lead origin stats
  const originStats: OriginStats[] = useMemo(() => {
    const originMap = new Map<string, number>();
    leads.forEach((lead) => {
      const origin = lead.lead_origin || "unknown";
      originMap.set(origin, (originMap.get(origin) || 0) + 1);
    });

    return Array.from(originMap.entries())
      .map(([name, count]) => ({
        name,
        displayName: getOriginDisplayLabel(name === "unknown" ? null : name),
        leads: count,
        type: getOriginType(name === "unknown" ? null : name),
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 8);
  }, [leads]);

  // Calculate source stats
  const sourceStats: SourceStats[] = useMemo(() => {
    const sourceMap = new Map<string, number>();
    leads.forEach((lead) => {
      const source = lead.source === "enove" ? "Enove" : lead.source;
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });

    return Array.from(sourceMap.entries())
      .map(([name, count]) => ({
        name,
        leads: count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
      }))
      .sort((a, b) => b.leads - a.leads);
  }, [leads]);

  // Enove vs Corretores split
  const enoveLeads = sourceStats.find(s => s.name === "Enove")?.leads || 0;
  const brokerLeads = leads.length - enoveLeads - inactivatedLeads;
  const distributionData = [
    { name: "Enove", value: enoveLeads },
    { name: "Corretores", value: brokerLeads },
  ].filter(d => d.value > 0);

  // Calculate page stats
  const pageStats: PageStats[] = useMemo(() => {
    const pageMap = new Map<string, number>();
    pageViews.forEach((pv) => {
      const current = pageMap.get(pv.page_path) || 0;
      pageMap.set(pv.page_path, current + 1);
    });

    const totalViews = pageViews.length;
    return Array.from(pageMap.entries())
      .map(([path, views]) => ({
        path: formatPagePath(path),
        views,
        percentage: totalViews > 0 ? (views / totalViews) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [pageViews]);

  // KPI calculations
  const totalViews = pageViews.length;
  const conversionRate = totalViews > 0 ? (leads.length / totalViews) * 100 : 0;
  const bestChannel = originStats.length > 0 ? originStats[0] : null;
  const topBroker = brokerPerformance.length > 0 ? brokerPerformance[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-white">
          Dashboard de Analytics
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[160px] bg-[#1e1e22] border-[#2a2a2e] text-white">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
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
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[#1e1e22] text-[#FFFF00] border border-[#2a2a2e] rounded-lg hover:bg-[#2a2a2e] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - 6 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Eye} label="Visualizações" value={totalViews} isLoading={isLoading} />
        <StatCard icon={Users} label="Sessões" value={uniqueSessions} isLoading={isLoading} />
        <StatCard icon={MousePointerClick} label="Leads" value={leads.length} isLoading={isLoading} />
        <StatCard icon={TrendingUp} label="Conversão" value={`${conversionRate.toFixed(1)}%`} isLoading={isLoading} />
        <StatCard icon={Target} label="Melhor Canal" value={bestChannel?.displayName || "-"} isLoading={isLoading} highlight />
        <StatCard icon={Award} label="Top Corretor" value={topBroker?.name || "-"} isLoading={isLoading} highlight />
      </div>

      {/* Daily Chart - Full width */}
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
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
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
          <div className="h-[280px]">
            {isLoading ? (
              <LoadingChart />
            ) : funnelData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={90} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum dado disponível</div>
            )}
          </div>
          {/* Inactivation rate */}
          <div className="mt-4 pt-4 border-t border-[#2a2a2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-400" />
              <span className="text-sm text-slate-400">Taxa de Inativação</span>
            </div>
            <span className={cn("text-sm font-bold", inactivationRate > 30 ? "text-red-400" : "text-slate-400")}>
              {inactivationRate.toFixed(1)}% ({inactivatedLeads} leads)
            </span>
          </div>
        </div>

        {/* Broker Performance */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#FFFF00]" />
            Performance dos Corretores
          </h3>
          {isLoading ? (
            <LoadingList />
          ) : brokerPerformance.length > 0 ? (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {brokerPerformance.slice(0, 8).map((broker, index) => (
                <div key={broker.id} className="p-3 bg-[#0f0f12] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        index === 0 ? "bg-[#FFFF00]/20 text-[#FFFF00]" : "bg-[#2a2a2e] text-slate-500"
                      )}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-white truncate max-w-[120px]">{broker.name}</span>
                    </div>
                    <span className="text-sm font-bold text-[#FFFF00]">{broker.conversionRate.toFixed(0)}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Leads</span>
                      <p className="font-medium text-white">{broker.totalLeads}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Registros</span>
                      <p className="font-medium text-green-500">{broker.registered}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Resp.</span>
                      <p className="font-medium text-white">{broker.avgResponseHours > 0 ? `${broker.avgResponseHours.toFixed(0)}h` : "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum dado disponível</div>
          )}
        </div>
      </div>

      {/* Middle Row: Cadastrado Por + Origem Marketing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Cadastrado Por - Horizontal Bar Chart */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FFFF00]" />
            Cadastrado Por
          </h3>
          <div className="h-[280px]">
            {isLoading ? (
              <LoadingChart />
            ) : sourceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceStats.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={{ stroke: "#2a2a2e" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#fff" }} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number, name: string, props: any) => [`${value} leads (${props.payload.percentage.toFixed(0)}%)`, "Leads"]} />
                  <Bar dataKey="leads" fill="#FFFF00" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum dado disponível</div>
            )}
          </div>
        </div>

        {/* Origem Marketing */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#FFFF00]" />
            Origem de Marketing
          </h3>
          <div className="h-[280px]">
            {isLoading ? (
              <LoadingChart />
            ) : originStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={originStats.slice(0, 6).map(o => ({ ...o, shortName: o.displayName.length > 15 ? o.displayName.substring(0, 12) + "..." : o.displayName }))} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" vertical={false} />
                  <XAxis dataKey="shortName" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={{ stroke: "#2a2a2e" }} interval={0} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={{ stroke: "#2a2a2e" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => [`${value} leads`, "Leads"]} labelFormatter={(label, payload) => payload?.[0]?.payload?.displayName || label} />
                  <Bar dataKey="leads" radius={[4, 4, 0, 0]} barSize={32}>
                    {originStats.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ORIGIN_COLORS[entry.type]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum dado disponível</div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            <LegendItem color={ORIGIN_COLORS.paid} label="Pago" />
            <LegendItem color={ORIGIN_COLORS.organic} label="Orgânico" />
            <LegendItem color={ORIGIN_COLORS.referral} label="Referral" />
            <LegendItem color={ORIGIN_COLORS.manual} label="Manual" />
            <LegendItem color={ORIGIN_COLORS.unknown} label="Outros" />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Distribution Pie */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#FFFF00]" />
            Distribuição de Cadastros
          </h3>
          <div className="h-[200px]">
            {isLoading ? (
              <LoadingChart />
            ) : distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                    <Cell fill="#FFFF00" />
                    <Cell fill="#22c55e" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => [`${value} leads`, "Leads"]} />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum dado disponível</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#2a2a2e]">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#FFFF00]">{enoveLeads}</p>
              <p className="text-xs text-slate-500">Enove</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{brokerLeads}</p>
              <p className="text-xs text-slate-500">Corretores</p>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4">Páginas Mais Acessadas</h3>
          {isLoading ? (
            <LoadingList />
          ) : pageStats.length > 0 ? (
            <div className="space-y-3">
              {pageStats.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0", index === 0 ? "bg-[#FFFF00]/20 text-[#FFFF00]" : "bg-[#2a2a2e] text-slate-500")}>{index + 1}</span>
                    <span className="text-sm text-white truncate">{page.path}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-white">{page.views}</span>
                    <span className="text-xs text-slate-500">({page.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">Nenhum dado disponível</div>
          )}
        </div>

        {/* Origin Table */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4">Leads por Origem</h3>
          {isLoading ? (
            <LoadingList />
          ) : originStats.length > 0 ? (
            <div className="space-y-2">
              {originStats.slice(0, 6).map((origin) => (
                <div key={origin.name} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ORIGIN_COLORS[origin.type] }} />
                    <span className="text-sm text-white truncate">{origin.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getOriginBadgeClass(origin.type))}>{getOriginTypeLabel(origin.type)}</span>
                    <span className="text-sm font-bold text-white w-8 text-right">{origin.leads}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">Nenhum dado disponível</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper components
const StatCard = ({ icon: Icon, label, value, isLoading, highlight = false }: { icon: React.ElementType; label: string; value: string | number; isLoading: boolean; highlight?: boolean }) => (
  <div className={cn("bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-3 sm:p-4", highlight && "ring-1 ring-[#FFFF00]/20")}>
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0", highlight ? "bg-[#FFFF00]/20" : "bg-[#FFFF00]/10")}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFFF00]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        {isLoading ? (
          <div className="h-5 sm:h-6 w-12 bg-[#2a2a2e] animate-pulse rounded mt-0.5" />
        ) : (
          <p className={cn("text-base sm:text-lg font-bold text-white truncate", highlight && "text-[#FFFF00]")}>{value}</p>
        )}
      </div>
    </div>
  </div>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
    <span className="text-xs text-slate-500">{label}</span>
  </div>
);

const LoadingChart = () => (
  <div className="h-full w-full flex items-center justify-center">
    <RefreshCw className="w-6 h-6 animate-spin text-[#FFFF00]" />
  </div>
);

const LoadingList = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-6 bg-[#2a2a2e] animate-pulse rounded" />
    ))}
  </div>
);

const formatPagePath = (path: string): string => {
  if (path === "/" || path === "") return "Página Inicial";
  if (path === "/estanciavelha") return "Landing Estância Velha";
  if (path === "/portao/goldenview") return "GoldenView";
  if (path.includes("/goldenview/")) return `GoldenView: ${path.split("/").pop()}`;
  if (path.startsWith("/c/")) return `Corretor: ${path.replace("/c/", "")}`;
  return path;
};

const getOriginTypeLabel = (type: OriginType): string => {
  const labels: Record<OriginType, string> = { paid: "Pago", organic: "Org.", referral: "Ref.", manual: "Man.", unknown: "-" };
  return labels[type];
};

const getOriginBadgeClass = (type: OriginType): string => {
  const classes: Record<OriginType, string> = {
    paid: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    organic: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    referral: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    manual: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    unknown: "bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300"
  };
  return classes[type];
};

export default AnalyticsDashboard;
