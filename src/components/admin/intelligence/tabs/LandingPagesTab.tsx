import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent, formatCurrency } from "../utils/calculations";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { OriginPerformance } from "../hooks/useIntelligenceData";

interface LandingPagesTabProps {
  data: OriginPerformance[];
}

export function LandingPagesTab({ data }: LandingPagesTabProps) {
  if (data.length === 0) {
    return <div className="text-center text-slate-400 py-12">Nenhuma origem encontrada no período.</div>;
  }

  return (
    <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2a2a2e] hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Origem</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Leads</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">% SLA</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Agend.</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Prop.</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Venda</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">VGV</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 ml-auto">
                      CPL <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#141417] border-[#2a2a2e] text-white text-xs">
                      Campo de custo será implementado futuramente
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-slate-400 text-xs text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 ml-auto">
                      ROI <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#141417] border-[#2a2a2e] text-white text-xs">
                      Campo de custo será implementado futuramente
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((o) => (
              <TableRow key={o.origin} className="border-[#2a2a2e] hover:bg-[#2a2a2e]/50">
                <TableCell className="text-white text-sm font-medium">{o.origin}</TableCell>
                <TableCell className="text-white text-sm text-right">{o.leads}</TableCell>
                <TableCell className="text-white text-sm text-right">{formatPercent(o.slaPercent)}</TableCell>
                <TableCell className="text-white text-sm text-right">{formatPercent(o.agendamentoRate)}</TableCell>
                <TableCell className="text-white text-sm text-right">{formatPercent(o.propostaRate)}</TableCell>
                <TableCell className="text-white text-sm text-right">{formatPercent(o.vendaRate)}</TableCell>
                <TableCell className="text-white text-sm text-right">{formatCurrency(o.vgv)}</TableCell>
                <TableCell className="text-slate-500 text-sm text-right">--</TableCell>
                <TableCell className="text-slate-500 text-sm text-right">--</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
