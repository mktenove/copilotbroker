import { cn } from "@/lib/utils";
import { formatPercent } from "../utils/calculations";
import type { SLADistribution, HeatmapCell } from "../hooks/useIntelligenceData";
import type { BrokerPerformance } from "../hooks/useIntelligenceData";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface SLATabProps {
  distribution: SLADistribution[];
  heatmap: HeatmapCell[];
  brokerPerformance: BrokerPerformance[];
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getHeatColor(slaPercent: number, volume: number): string {
  if (volume === 0) return "#141417";
  if (slaPercent >= 0.8) return "#22c55e33";
  if (slaPercent >= 0.5) return "#fbbf2433";
  return "#ef444433";
}

export function SLATab({ distribution, heatmap, brokerPerformance }: SLATabProps) {
  const disciplineRanking = [...brokerPerformance]
    .filter(b => b.leads > 0)
    .sort((a, b) => a.timeoutLossRate - b.timeoutLossRate)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Distribution Chart */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-4">Distribuição de Tempo até Atendimento</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
            <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8 }} labelStyle={{ color: "#fff" }} formatter={(value: number, name: string) => [value, "Leads"]} />
            <Bar dataKey="count" fill="#FFFF00" radius={[4, 4, 0, 0]} name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-4">Heatmap: SLA por Dia/Hora</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[60px_repeat(15,1fr)] gap-1">
              <div />
              {Array.from({ length: 15 }, (_, i) => (
                <div key={i} className="text-center text-[10px] text-slate-500">{i + 8}h</div>
              ))}
              {DAY_LABELS.map((day, di) => (
                <>
                  <div key={`label-${di}`} className="text-xs text-slate-400 flex items-center">{day}</div>
                  {Array.from({ length: 15 }, (_, hi) => {
                    const cell = heatmap.find(c => c.day === di && c.hour === hi + 8);
                    return (
                      <div
                        key={`${di}-${hi}`}
                        className="aspect-square rounded-sm flex items-center justify-center text-[9px] text-white/60"
                        style={{ backgroundColor: getHeatColor(cell?.slaPercent || 0, cell?.volume || 0) }}
                        title={`${day} ${hi + 8}h: ${cell?.volume || 0} leads, ${formatPercent(cell?.slaPercent || 0)} SLA`}
                      >
                        {(cell?.volume || 0) > 0 ? cell!.volume : ""}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e33" }} /> ≥80% SLA</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#fbbf2433" }} /> 50-80%</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef444433" }} /> &lt;50%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Discipline Ranking */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-3">Ranking de Disciplina (menor timeout)</h3>
        <div className="space-y-2">
          {disciplineRanking.map((b, i) => (
            <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#141417]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-5">{i + 1}</span>
                <span className="text-sm text-white">{b.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">{b.timeouts} timeouts</span>
                <span className={cn(
                  "font-medium",
                  b.timeoutLossRate < 0.1 ? "text-emerald-400" : b.timeoutLossRate < 0.25 ? "text-yellow-400" : "text-red-400"
                )}>
                  {formatPercent(b.timeoutLossRate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
