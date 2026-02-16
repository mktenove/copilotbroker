import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes, formatCurrency, formatPercent } from "../utils/calculations";
import { cn } from "@/lib/utils";
import type { BrokerPerformance } from "../hooks/useIntelligenceData";

interface CorretoresTabProps {
  data: BrokerPerformance[];
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-emerald-400 bg-emerald-400/10" : score >= 40 ? "text-yellow-400 bg-yellow-400/10" : "text-red-400 bg-red-400/10";
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", color)}>{score}</span>;
}

export function CorretoresTab({ data }: CorretoresTabProps) {
  if (data.length === 0) {
    return <div className="text-center text-slate-400 py-12">Nenhum corretor encontrado no período.</div>;
  }

  return (
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
                <TableCell className="text-right"><ScoreBadge score={b.score} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
