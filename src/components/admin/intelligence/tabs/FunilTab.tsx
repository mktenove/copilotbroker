import { cn } from "@/lib/utils";
import { formatPercent } from "../utils/calculations";
import type { FunnelStage } from "../hooks/useIntelligenceData";

interface FunilTabProps {
  data: FunnelStage[];
}

const STAGE_COLORS = ["#FFFF00", "#fbbf24", "#f97316", "#ef4444", "#22c55e"];

export function FunilTab({ data }: FunilTabProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Visual Funnel */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-6">Funil de Conversão</h3>
        <div className="space-y-3">
          {data.map((stage, i) => {
            const widthPercent = Math.max((stage.count / maxCount) * 100, 8);
            return (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{stage.name}</span>
                    {stage.isBottleneck && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">
                        Gargalo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-bold">{stage.count}</span>
                    {stage.conversionFromPrev !== null && i > 0 && (
                      <span className="text-xs text-slate-400">
                        {formatPercent(stage.conversionFromPrev)} conv.
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-[#141417] rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: STAGE_COLORS[i] || "#FFFF00",
                      opacity: 0.8,
                    }}
                  />
                </div>
                {stage.abandonRate > 0 && (
                  <div className="text-xs text-red-400/70 text-right">
                    {formatPercent(stage.abandonRate)} abandono
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-3">Resumo por Etapa</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {data.map((stage, i) => (
            <div key={stage.name} className="text-center p-3 bg-[#141417] rounded-lg">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: STAGE_COLORS[i] }} />
              <p className="text-xs text-slate-400">{stage.name}</p>
              <p className="text-lg font-bold text-white">{stage.count}</p>
              {stage.conversionFromPrev !== null && i > 0 && (
                <p className="text-xs text-slate-500">{formatPercent(stage.conversionFromPrev)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
