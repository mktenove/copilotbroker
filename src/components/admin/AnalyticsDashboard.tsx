import { useState, useEffect } from "react";
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
  Megaphone
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
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
} from "recharts";
import { getOriginDisplayLabel, getOriginType, OriginType } from "@/types/crm";
import { cn } from "@/lib/utils";

interface PageView {
  id: string;
  page_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  session_id: string | null;
  created_at: string;
}

interface Lead {
  id: string;
  source: string;
  lead_origin: string | null;
  created_at: string;
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

// Cores por tipo de origem
const ORIGIN_COLORS: Record<OriginType, string> = {
  paid: "#9333ea",
  organic: "#22c55e", 
  referral: "#3b82f6",
  manual: "#f59e0b",
  unknown: "#64748b"
};

const PIE_COLORS = ["hsl(var(--primary))", "#22c55e", "#3b82f6", "#f59e0b", "#9333ea", "#ef4444"];

const AnalyticsDashboard = () => {
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setIsLoading(true);
    const startDate = startOfDay(subDays(new Date(), dateRange)).toISOString();
    const endDate = endOfDay(new Date()).toISOString();

    try {
      const [viewsResult, leadsResult] = await Promise.all([
        (supabase
          .from("page_views" as any)
          .select("*")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: false }) as any),
        (supabase
          .from("leads" as any)
          .select("id, source, lead_origin, created_at")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: false }) as any),
      ]);

      if (viewsResult.data) setPageViews(viewsResult.data as PageView[]);
      if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate unique sessions
  const uniqueSessions = new Set(pageViews.map((pv) => pv.session_id)).size;

  // Calculate daily stats
  const dailyStats: DailyStats[] = [];
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

    dailyStats.push({
      date: displayDate,
      views: dayViews,
      leads: dayLeads,
    });
  }

  // Calculate lead origin stats (from lead_origin field)
  const originMap = new Map<string, number>();
  leads.forEach((lead) => {
    const origin = lead.lead_origin || "unknown";
    originMap.set(origin, (originMap.get(origin) || 0) + 1);
  });

  const originStats: OriginStats[] = Array.from(originMap.entries())
    .map(([name, count]) => ({
      name,
      displayName: getOriginDisplayLabel(name === "unknown" ? null : name),
      leads: count,
      type: getOriginType(name === "unknown" ? null : name),
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);

  // Calculate "Cadastrado por" stats (from source field)
  const sourceMap = new Map<string, number>();
  leads.forEach((lead) => {
    const source = lead.source === "enove" ? "Enove" : lead.source;
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  const sourceStats: SourceStats[] = Array.from(sourceMap.entries())
    .map(([name, count]) => ({
      name,
      leads: count,
      percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  // Enove vs Corretores split
  const enoveLeads = sourceStats.find(s => s.name === "Enove")?.leads || 0;
  const brokerLeads = leads.length - enoveLeads;
  const distributionData = [
    { name: "Enove", value: enoveLeads },
    { name: "Corretores", value: brokerLeads },
  ].filter(d => d.value > 0);

  // Calculate page stats
  const pageMap = new Map<string, number>();
  pageViews.forEach((pv) => {
    const current = pageMap.get(pv.page_path) || 0;
    pageMap.set(pv.page_path, current + 1);
  });

  const totalViews = pageViews.length;
  const pageStats: PageStats[] = Array.from(pageMap.entries())
    .map(([path, views]) => ({
      path: formatPagePath(path),
      views,
      percentage: totalViews > 0 ? (views / totalViews) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Conversion rate
  const conversionRate = totalViews > 0 ? (leads.length / totalViews) * 100 : 0;

  // Best channel (highest leads)
  const bestChannel = originStats.length > 0 ? originStats[0] : null;

  // Top broker (excluding Enove)
  const topBroker = sourceStats.find(s => s.name !== "Enove");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-foreground">
          Dashboard de Analytics
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
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
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - 6 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Eye}
          label="Visualizações"
          value={totalViews}
          isLoading={isLoading}
        />
        <StatCard
          icon={Users}
          label="Sessões"
          value={uniqueSessions}
          isLoading={isLoading}
        />
        <StatCard
          icon={MousePointerClick}
          label="Leads"
          value={leads.length}
          isLoading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Conversão"
          value={`${conversionRate.toFixed(1)}%`}
          isLoading={isLoading}
        />
        <StatCard
          icon={Target}
          label="Melhor Canal"
          value={bestChannel?.displayName || "-"}
          isLoading={isLoading}
          highlight
        />
        <StatCard
          icon={Award}
          label="Top Corretor"
          value={topBroker?.name || "-"}
          isLoading={isLoading}
          highlight
        />
      </div>

      {/* Daily Chart - Full width */}
      <div className="card-luxury p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-medium text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
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
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                  name="Visitas"
                />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#22c55e" }}
                  name="Leads"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Middle Row: Cadastrado Por + Origem Marketing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Cadastrado Por - Horizontal Bar Chart */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Cadastrado Por
          </h3>
          <div className="h-[280px]">
            {isLoading ? (
              <LoadingChart />
            ) : sourceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={sourceStats.slice(0, 6)} 
                  layout="vertical" 
                  margin={{ left: 10, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} leads (${props.payload.percentage.toFixed(0)}%)`,
                      "Leads"
                    ]}
                  />
                  <Bar 
                    dataKey="leads" 
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Origem Marketing - Vertical Bar Chart */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Origem de Marketing
          </h3>
          <div className="h-[280px]">
            {isLoading ? (
              <LoadingChart />
            ) : originStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={originStats.slice(0, 6).map(o => ({
                    ...o,
                    shortName: o.displayName.length > 15 
                      ? o.displayName.substring(0, 12) + "..." 
                      : o.displayName
                  }))} 
                  margin={{ bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="shortName"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
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
                    formatter={(value: number) => [`${value} leads`, "Leads"]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.displayName || label;
                    }}
                  />
                  <Bar 
                    dataKey="leads"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  >
                    {originStats.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ORIGIN_COLORS[entry.type]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            <LegendItem color={ORIGIN_COLORS.paid} label="Pago" />
            <LegendItem color={ORIGIN_COLORS.organic} label="Orgânico" />
            <LegendItem color={ORIGIN_COLORS.referral} label="Referral" />
            <LegendItem color={ORIGIN_COLORS.manual} label="Manual" />
            <LegendItem color={ORIGIN_COLORS.unknown} label="Outros" />
          </div>
        </div>
      </div>

      {/* Bottom Row: Distribution Pie + Pages + Origin Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Distribution Pie */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Distribuição de Cadastros
          </h3>
          <div className="h-[200px]">
            {isLoading ? (
              <LoadingChart />
            ) : distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="#22c55e" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value} leads`, "Leads"]}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
          {/* Stats below */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{enoveLeads}</p>
              <p className="text-xs text-muted-foreground">Enove</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{brokerLeads}</p>
              <p className="text-xs text-muted-foreground">Corretores</p>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4">
            Páginas Mais Acessadas
          </h3>
          {isLoading ? (
            <LoadingList />
          ) : pageStats.length > 0 ? (
            <div className="space-y-3">
              {pageStats.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      index === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {page.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-foreground">
                      {page.views}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({page.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Origin Table */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4">
            Leads por Origem
          </h3>
          {isLoading ? (
            <LoadingList />
          ) : originStats.length > 0 ? (
            <div className="space-y-2">
              {originStats.slice(0, 6).map((origin) => (
                <div key={origin.name} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div 
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ORIGIN_COLORS[origin.type] }}
                    />
                    <span className="text-sm text-foreground truncate">
                      {origin.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      getOriginBadgeClass(origin.type)
                    )}>
                      {getOriginTypeLabel(origin.type)}
                    </span>
                    <span className="text-sm font-bold text-foreground w-8 text-right">
                      {origin.leads}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper components
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  isLoading,
  highlight = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  isLoading: boolean;
  highlight?: boolean;
}) => (
  <div className={cn(
    "card-luxury p-3 sm:p-4",
    highlight && "ring-1 ring-primary/20"
  )}>
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={cn(
        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0",
        highlight ? "bg-primary/20" : "bg-primary/10"
      )}>
        <Icon className={cn(
          "w-4 h-4 sm:w-5 sm:h-5",
          highlight ? "text-primary" : "text-primary"
        )} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {isLoading ? (
          <div className="h-5 sm:h-6 w-12 bg-muted animate-pulse rounded mt-0.5" />
        ) : (
          <p className={cn(
            "text-base sm:text-lg font-bold text-foreground truncate",
            highlight && "text-primary"
          )}>{value}</p>
        )}
      </div>
    </div>
  </div>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div 
      className="w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

const LoadingChart = () => (
  <div className="h-full w-full flex items-center justify-center">
    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const LoadingList = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-6 bg-muted animate-pulse rounded" />
    ))}
  </div>
);

// Helper functions
const formatPagePath = (path: string): string => {
  if (path === "/" || path === "") return "Página Inicial";
  if (path === "/estanciavelha") return "Landing Enove";
  if (path.startsWith("/c/")) {
    const slug = path.replace("/c/", "");
    return `Corretor: ${slug}`;
  }
  return path;
};

const getOriginTypeLabel = (type: OriginType): string => {
  const labels: Record<OriginType, string> = {
    paid: "Pago",
    organic: "Org.",
    referral: "Ref.",
    manual: "Man.",
    unknown: "-"
  };
  return labels[type];
};

const getOriginBadgeClass = (type: OriginType): string => {
  const classes: Record<OriginType, string> = {
    paid: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    organic: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    referral: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    manual: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    unknown: "bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300"
  };
  return classes[type];
};

export default AnalyticsDashboard;
