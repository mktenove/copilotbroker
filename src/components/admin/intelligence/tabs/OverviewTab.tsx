import { ShoppingCart, DollarSign, TrendingUp, Users, Send, Clock, Target, AlertTriangle, FileText, Trophy, ArrowDown, ChevronRight } from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { AlertCard } from "../components/AlertCard";
import { formatMinutes, formatCurrency, formatPercent } from "../utils/calculations";
import type { OverviewData } from "../hooks/useIntelligenceData";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  data: OverviewData;
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-slate-500">{icon}</span>}
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const color = score >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : score >= 40 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" : "text-red-400 bg-red-400/10 border-red-400/20";
  return (
    <span className={cn(
      "rounded-full font-bold border",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      color,
    )}>{score}</span>
  );
}

export function OverviewTab({ data }: OverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* Resultado */}
      <section>
        <SectionTitle icon={<Trophy className="w-3.5 h-3.5" />}>Resultado</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard size="lg" label="Vendas" value={data.totalSales} variation={data.variations.totalSales} icon={<ShoppingCart className="w-5 h-5" />} status={data.totalSales > 0 ? "good" : "neutral"} />
          <MetricCard size="lg" label="VGV Total" value={formatCurrency(data.vgvTotal)} variation={data.variations.vgvTotal} icon={<DollarSign className="w-5 h-5" />} status={data.vgvTotal > 0 ? "good" : "neutral"} />
          <MetricCard size="lg" label="Conversão Geral" value={formatPercent(data.conversionRate)} icon={<TrendingUp className="w-5 h-5" />} status={data.conversionRate >= 0.05 ? "good" : data.conversionRate > 0 ? "neutral" : "bad"} />
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <SectionTitle icon={<Users className="w-3.5 h-3.5" />}>Pipeline</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total de Leads" value={data.totalLeads} variation={data.variations.totalLeads} icon={<Users className="w-4 h-4" />} />
          <MetricCard label="Distribuídos" value={data.leadsDistributed} subtitle="por roleta" icon={<Send className="w-4 h-4" />} />
          <MetricCard label="Em Atendimento" value={data.leadsInProgress} subtitle="info_sent / awaiting" />
          <MetricCard label="Propostas Ativas" value={data.activeProposals} icon={<FileText className="w-4 h-4" />} />
        </div>
      </section>

      {/* Saúde Operacional */}
      <section>
        <SectionTitle icon={<Target className="w-3.5 h-3.5" />}>Saúde Operacional</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard size="sm" label="Tempo 1º Atendimento" value={formatMinutes(data.avgFirstResponse)} icon={<Clock className="w-4 h-4" />} status={data.avgFirstResponse !== null ? (data.avgFirstResponse <= 10 ? "good" : "bad") : "neutral"} />
          <MetricCard size="sm" label="% SLA" value={formatPercent(data.slaPercent)} icon={<Target className="w-4 h-4" />} status={data.slaPercent >= 0.7 ? "good" : "bad"} />
          <MetricCard size="sm" label="Fallbacks" value={data.leadsFallback} subtitle="para líder" icon={<AlertTriangle className="w-4 h-4" />} status={data.leadsFallback === 0 ? "good" : data.leadsFallback > 5 ? "bad" : "neutral"} />
          <MetricCard size="sm" label="Taxa de Perda" value={formatPercent(data.lossRate)} variation={data.variations.leadsLost} invertVariation icon={<ArrowDown className="w-4 h-4" />} status={data.lossRate <= 0.15 ? "good" : data.lossRate > 0.3 ? "bad" : "neutral"} />
        </div>
      </section>

      {/* Mini Funil */}
      <section>
        <SectionTitle>Funil Resumido</SectionTitle>
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-5">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {data.miniFunnel.map((stage, i) => (
              <div key={stage.name} className="flex items-center gap-1 min-w-0">
                <div className="text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-white">{stage.count}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{stage.name}</p>
                </div>
                {i < data.miniFunnel.length - 1 && (
                  <div className="flex flex-col items-center mx-1 shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                    {data.miniFunnel[i + 1].convRate !== null && (
                      <span className="text-[9px] text-slate-500 mt-0.5">
                        {(data.miniFunnel[i + 1].convRate! * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alertas Estratégicos */}
      {data.alerts.length > 0 && (
        <section>
          <SectionTitle icon={<AlertTriangle className="w-3.5 h-3.5" />}>Alertas Estratégicos</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {/* Top Performers & Needs Attention */}
      {(data.topPerformers.length > 0 || data.needsAttention.length > 0) && (
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Performers */}
            {data.topPerformers.length > 0 && (
              <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-5">
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5" /> Top Performers
                </h4>
                <div className="space-y-3">
                  {data.topPerformers.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-600 w-6 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.vendas} vendas · {formatCurrency(b.vgv)}</p>
                      </div>
                      <ScoreBadge score={b.score} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Needs Attention */}
            {data.needsAttention.length > 0 && (
              <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-5">
                <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Oportunidade de Melhoria
                </h4>
                <div className="space-y-3">
                  {data.needsAttention.map((b) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.vendas} vendas · {formatCurrency(b.vgv)}</p>
                      </div>
                      <ScoreBadge score={b.score} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
