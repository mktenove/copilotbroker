import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Clock, Target, TrendingUp, DollarSign, AlertTriangle, FileText, ShoppingCart } from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { formatMinutes, formatCurrency, formatPercent } from "../utils/calculations";
import type { OverviewData } from "../hooks/useIntelligenceData";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface OverviewTabProps {
  data: OverviewData;
}

export function OverviewTab({ data }: OverviewTabProps) {
  const chartData = useMemo(() => {
    const allDates = new Set([...data.dailyLeads.map(d => d.date), ...data.dailySales.map(d => d.date)]);
    return Array.from(allDates).sort().map(date => {
      const lead = data.dailyLeads.find(d => d.date === date);
      const sale = data.dailySales.find(d => d.date === date);
      return {
        date: format(new Date(date + "T12:00:00"), "dd/MM", { locale: ptBR }),
        leads: lead?.count || 0,
        vendas: sale?.count || 0,
        vgv: sale?.vgv || 0,
      };
    });
  }, [data.dailyLeads, data.dailySales]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <MetricCard label="Total de Leads" value={data.totalLeads} variation={data.variations.totalLeads} icon={<Users className="w-4 h-4" />} />
        <MetricCard label="Distribuídos" value={data.leadsDistributed} subtitle="por roleta" />
        <MetricCard label="Fallback" value={data.leadsFallback} subtitle="líder" icon={<AlertTriangle className="w-4 h-4" />} />
        <MetricCard label="Tempo 1º Atend." value={formatMinutes(data.avgFirstResponse)} icon={<Clock className="w-4 h-4" />} />
        <MetricCard label="% SLA" value={formatPercent(data.slaPercent)} icon={<Target className="w-4 h-4" />} />
        <MetricCard label="Propostas" value={data.totalProposals} icon={<FileText className="w-4 h-4" />} />
        <MetricCard label="Vendas" value={data.totalSales} variation={data.variations.totalSales} icon={<ShoppingCart className="w-4 h-4" />} />
        <MetricCard label="Conversão" value={formatPercent(data.conversionRate)} icon={<TrendingUp className="w-4 h-4" />} />
        <MetricCard label="VGV Total" value={formatCurrency(data.vgvTotal)} variation={data.variations.vgvTotal} icon={<DollarSign className="w-4 h-4" />} />
        <MetricCard label="Ticket Médio" value={formatCurrency(data.ticketMedio)} />
        <MetricCard label="Perdidos" value={data.leadsLost} variation={data.variations.leadsLost} invertVariation icon={<AlertTriangle className="w-4 h-4" />} />
        <MetricCard label="Taxa de Perda" value={formatPercent(data.lossRate)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads + Vendas por dia */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-4">Leads & Vendas por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="#FFFF00" strokeWidth={2} name="Leads" dot={false} />
              <Line type="monotone" dataKey="vendas" stroke="#22c55e" strokeWidth={2} name="Vendas" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* VGV por dia */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-4">VGV por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8 }} labelStyle={{ color: "#fff" }} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "VGV"]} />
              <Bar dataKey="vgv" fill="#FFFF00" radius={[4, 4, 0, 0]} name="VGV" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
