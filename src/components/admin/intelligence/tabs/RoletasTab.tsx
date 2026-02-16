import { HealthIndicator } from "../components/HealthIndicator";
import { formatMinutes, formatPercent, formatCurrency } from "../utils/calculations";
import type { RoletaAnalysis } from "../hooks/useIntelligenceData";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface RoletasTabProps {
  data: RoletaAnalysis[];
}

export function RoletasTab({ data }: RoletasTabProps) {
  if (data.length === 0) {
    return <div className="text-center text-slate-400 py-12">Nenhuma roleta encontrada.</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((r) => (
        <div key={r.id} className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{r.nome}</h3>
            <HealthIndicator status={r.health} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <span className="text-slate-400 text-xs">Distribuídos</span>
              <p className="text-white font-medium">{r.leadsDistributed}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Tempo Médio</span>
              <p className="text-white font-medium">{formatMinutes(r.avgResponseTime)}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">% Timeout</span>
              <p className="text-white font-medium">{formatPercent(r.timeoutRate)}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Fallbacks</span>
              <p className="text-white font-medium">{r.fallbacks}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Membros</span>
              <p className="text-white font-medium">{r.members.length}</p>
            </div>
          </div>

          {r.members.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 mb-2">Distribuição por Membro</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={r.members} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis dataKey="brokerName" type="category" width={100} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                  <Bar dataKey="leads" fill="#FFFF00" radius={[0, 4, 4, 0]} name="Leads" />
                  <Bar dataKey="vendas" fill="#22c55e" radius={[0, 4, 4, 0]} name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
