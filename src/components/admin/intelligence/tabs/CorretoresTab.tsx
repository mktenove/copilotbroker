import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes, formatCurrency, formatPercent } from "../utils/calculations";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, Clock, Target, ShoppingCart, DollarSign, Users, AlertTriangle, FileText, CalendarCheck } from "lucide-react";
import type { BrokerPerformance } from "../hooks/useIntelligenceData";

interface CorretoresTabProps {
  data: BrokerPerformance[];
}

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = score >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : score >= 40 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" : "text-red-400 bg-red-400/10 border-red-400/20";
  const sizeClass = size === "lg" ? "w-14 h-14 text-xl" : size === "md" ? "w-10 h-10 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={cn(
      "rounded-full font-bold border flex items-center justify-center",
      sizeClass,
      color,
    )}>{score}</span>
  );
}

function SLABar({ percent }: { percent: number }) {
  const pct = Math.round(percent * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-500">SLA</span>
        <span className="text-[10px] font-medium text-slate-300">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#141417] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MicroMetric({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-slate-600">{icon}</span>}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function BrokerCard({ broker, rank }: { broker: BrokerPerformance; rank: number }) {
  return (
    <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg font-bold text-slate-600">#{rank}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{broker.name}</p>
            <p className="text-xs text-slate-500">{broker.leads} leads no período</p>
          </div>
        </div>
        <ScoreBadge score={broker.score} size="lg" />
      </div>

      {/* SLA Bar */}
      <SLABar percent={broker.slaPercent} />

      {/* Micro metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MicroMetric label="1º Atendimento" value={formatMinutes(broker.avgFirstResponse)} icon={<Clock className="w-3.5 h-3.5" />} />
        <MicroMetric label="Timeouts" value={broker.timeouts} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <MicroMetric label="Agendamentos" value={broker.agendamentos} icon={<CalendarCheck className="w-3.5 h-3.5" />} />
        <MicroMetric label="Propostas" value={broker.propostas} icon={<FileText className="w-3.5 h-3.5" />} />
        <MicroMetric label="Vendas" value={broker.vendas} icon={<ShoppingCart className="w-3.5 h-3.5" />} />
        <MicroMetric label="Conversão" value={formatPercent(broker.conversionRate)} icon={<Target className="w-3.5 h-3.5" />} />
        <MicroMetric label="VGV" value={formatCurrency(broker.vgv)} icon={<DollarSign className="w-3.5 h-3.5" />} />
        <MicroMetric label="Ticket Médio" value={formatCurrency(broker.ticketMedio)} />
      </div>
    </div>
  );
}

export function CorretoresTab({ data }: CorretoresTabProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  if (data.length === 0) {
    return <div className="text-center text-slate-400 py-12">Nenhum corretor encontrado no período.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => setViewMode("cards")}
          className={cn(
            "p-2 rounded-lg transition-colors",
            viewMode === "cards" ? "bg-[#FFFF00]/10 text-[#FFFF00]" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode("table")}
          className={cn(
            "p-2 rounded-lg transition-colors",
            viewMode === "table" ? "bg-[#FFFF00]/10 text-[#FFFF00]" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((b, i) => (
            <BrokerCard key={b.id} broker={b} rank={i + 1} />
          ))}
        </div>
      ) : (
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2a2a2e] hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">#</TableHead>
                  <TableHead className="text-slate-400 text-xs">Corretor</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Leads</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">1º Atend.</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">SLA</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Timeouts</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Agend.</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Prop.</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Vendas</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Conv.</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">VGV</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Ticket</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((b, i) => (
                  <TableRow key={b.id} className="border-[#2a2a2e] hover:bg-[#2a2a2e]/50">
                    <TableCell className="text-slate-500 text-xs">{i + 1}</TableCell>
                    <TableCell className="text-white text-sm font-medium whitespace-nowrap">{b.name}</TableCell>
                    <TableCell className="text-white text-sm text-right">{b.leads}</TableCell>
                    <TableCell className="text-white text-sm text-right">{formatMinutes(b.avgFirstResponse)}</TableCell>
                    <TableCell className="text-white text-sm text-right">{formatPercent(b.slaPercent)}</TableCell>
                    <TableCell className="text-white text-sm text-right">{b.timeouts}</TableCell>
                    <TableCell className="text-white text-sm text-right">{b.agendamentos}</TableCell>
                    <TableCell className="text-white text-sm text-right">{b.propostas}</TableCell>
                    <TableCell className="text-white text-sm text-right">{b.vendas}</TableCell>
                    <TableCell className="text-white text-sm text-right">{formatPercent(b.conversionRate)}</TableCell>
                    <TableCell className="text-white text-sm text-right">{formatCurrency(b.vgv)}</TableCell>
                    <TableCell className="text-white text-sm text-right">{formatCurrency(b.ticketMedio)}</TableCell>
                    <TableCell className="text-right"><ScoreBadge score={b.score} size="sm" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
