import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MousePointerClick,
  RefreshCw,
  Eye,
  Calendar
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
  created_at: string;
}

interface DailyStats {
  date: string;
  views: number;
  leads: number;
}

interface SourceStats {
  name: string;
  views: number;
  leads: number;
  conversionRate: number;
}

interface PageStats {
  path: string;
  views: number;
  percentage: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

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
          .select("id, source, created_at")
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

  // Calculate source stats
  const sourceMap = new Map<string, { views: number; leads: number }>();
  
  pageViews.forEach((pv) => {
    const source = pv.utm_source || getSourceFromReferrer(pv.referrer) || "Direto";
    const current = sourceMap.get(source) || { views: 0, leads: 0 };
    sourceMap.set(source, { ...current, views: current.views + 1 });
  });

  leads.forEach((lead) => {
    // Match leads to source based on their source field
    const source = lead.source === "enove" ? "Direto" : lead.source;
    const current = sourceMap.get(source) || { views: 0, leads: 0 };
    sourceMap.set(source, { ...current, leads: current.leads + 1 });
  });

  const sourceStats: SourceStats[] = Array.from(sourceMap.entries())
    .map(([name, stats]) => ({
      name: formatSourceName(name),
      views: stats.views,
      leads: stats.leads,
      conversionRate: stats.views > 0 ? (stats.leads / stats.views) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Eye}
          label="Visualizações"
          value={totalViews}
          isLoading={isLoading}
        />
        <StatCard
          icon={Users}
          label="Sessões Únicas"
          value={uniqueSessions}
          isLoading={isLoading}
        />
        <StatCard
          icon={MousePointerClick}
          label="Leads Captados"
          value={leads.length}
          isLoading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${conversionRate.toFixed(1)}%`}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Daily Views Chart */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Visitas por Dia
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

        {/* Traffic Sources Pie Chart */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Origem do Tráfego
          </h3>
          <div className="h-[250px] sm:h-[300px]">
            {isLoading ? (
              <LoadingChart />
            ) : sourceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="views"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {sourceStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value} visitas`, "Visitas"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                    <span className="text-xs font-medium text-muted-foreground w-5">
                      {index + 1}.
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

        {/* Conversion by Source */}
        <div className="card-luxury p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-foreground mb-4">
            Conversão por Origem
          </h3>
          {isLoading ? (
            <LoadingList />
          ) : sourceStats.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
                <span>Origem</span>
                <span className="text-right">Visitas</span>
                <span className="text-right">Leads</span>
                <span className="text-right">Conv.</span>
              </div>
              {sourceStats.map((source) => (
                <div key={source.name} className="grid grid-cols-4 gap-2 text-sm">
                  <span className="text-foreground truncate">{source.name}</span>
                  <span className="text-right text-muted-foreground">{source.views}</span>
                  <span className="text-right text-foreground font-medium">{source.leads}</span>
                  <span className="text-right text-primary font-medium">
                    {source.conversionRate.toFixed(1)}%
                  </span>
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
  isLoading 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  isLoading: boolean;
}) => (
  <div className="card-luxury p-4 sm:p-6">
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
        {isLoading ? (
          <div className="h-6 sm:h-8 w-16 bg-muted animate-pulse rounded mt-1" />
        ) : (
          <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
        )}
      </div>
    </div>
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
const getSourceFromReferrer = (referrer: string | null): string | null => {
  if (!referrer) return null;
  
  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    
    if (hostname.includes("google")) return "google";
    if (hostname.includes("facebook") || hostname.includes("fb.")) return "facebook";
    if (hostname.includes("instagram")) return "instagram";
    if (hostname.includes("bing")) return "bing";
    if (hostname.includes("yahoo")) return "yahoo";
    if (hostname.includes("linkedin")) return "linkedin";
    
    return hostname;
  } catch {
    return null;
  }
};

const formatSourceName = (source: string): string => {
  const sourceNames: Record<string, string> = {
    google: "Google",
    facebook: "Facebook",
    instagram: "Instagram",
    bing: "Bing",
    yahoo: "Yahoo",
    linkedin: "LinkedIn",
    direct: "Direto",
    direto: "Direto",
  };
  
  return sourceNames[source.toLowerCase()] || source;
};

const formatPagePath = (path: string): string => {
  if (path === "/" || path === "") return "Página Inicial";
  if (path === "/estanciavelha") return "Landing Enove";
  
  // Remove leading slash and format
  const formatted = path.replace(/^\//, "");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export default AnalyticsDashboard;
