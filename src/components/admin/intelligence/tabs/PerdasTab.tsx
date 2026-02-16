import { formatPercent } from "../utils/calculations";
import type { LossAnalysis } from "../hooks/useIntelligenceData";
import { MetricCard } from "../components/MetricCard";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface PerdasTabProps {
  data: LossAnalysis;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"];

export function PerdasTab({ data }: PerdasTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard label="Total Perdidos" value={data.totalLost} />
        <MetricCard label="Taxa de Perda" value={formatPercent(data.lossRate)} />
        <MetricCard label="Principal Motivo" value={data.byReason[0]?.reason || "--"} subtitle={data.byReason[0] ? `${data.byReason[0].count} leads` : ""} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Reason - Pie */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-4">Por Motivo</h3>
          {data.byReason.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.byReason} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={90} label={({ reason, count }) => `${reason} (${count})`} labelLine={false}>
                  {data.byReason.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">Sem dados</p>
          )}
        </div>

        {/* By Stage - Bars */}
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-4">Por Etapa de Perda</h3>
          {data.byStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.byStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" width={120} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Perdas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">Sem dados</p>
          )}
        </div>
      </div>

      {/* By Broker */}
      {data.byBroker.length > 0 && (
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Perdas por Corretor</h3>
          <div className="space-y-2">
            {data.byBroker.slice(0, 10).map((b) => (
              <div key={b.brokerId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#141417]">
                <span className="text-sm text-white">{b.brokerName}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400">{b.count} perdas</span>
                  <span className="text-red-400 font-medium">{formatPercent(b.rate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Origin */}
      {data.byOrigin.length > 0 && (
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Perdas por Origem</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.byOrigin.slice(0, 8).map((o) => (
              <div key={o.origin} className="text-center p-3 bg-[#141417] rounded-lg">
                <p className="text-xs text-slate-400 truncate">{o.origin}</p>
                <p className="text-lg font-bold text-white">{o.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
