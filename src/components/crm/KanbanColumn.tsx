import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, MessageSquare } from "lucide-react";
import { CRMLead, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanColumnProps {
  status: LeadStatus;
  leads: CRMLead[];
  newLeadIds?: Set<string>;
  cadenciaLeadIds?: Set<string>;
  onCancelCadencia?: (leadId: string) => void;
  onCardClick: (lead: CRMLead) => void;
  onUpdateOrigin?: (leadId: string, origin: string) => Promise<void>;
  onDelete?: (leadId: string) => Promise<void>;
  onIniciarAtendimento?: (leadId: string) => Promise<void>;
  onOpenAgendamento?: (leadId: string) => void;
  onOpenComparecimento?: (leadId: string) => void;
  onOpenVenda?: (leadId: string) => void;
  onOpenPerda?: (leadId: string, currentStatus: LeadStatus) => void;
  onDispatchWhatsApp?: (status: LeadStatus) => void;
  onAddLead?: () => void;
  onOpenProposta?: (leadId: string) => void;
  onOpenReagendamento?: (leadId: string) => void;
}

const STATUS_SQUARE_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  info_sent: "bg-enove-yellow",
  awaiting_docs: "bg-enove-yellow",
  scheduling: "bg-orange-500",
  docs_received: "bg-emerald-500",
  registered: "bg-slate-400",
  inactive: "bg-red-500"
};

export function KanbanColumn({ status, leads, newLeadIds, cadenciaLeadIds, onCancelCadencia, onCardClick, onUpdateOrigin, onDelete, onIniciarAtendimento, onOpenAgendamento, onOpenComparecimento, onOpenVenda, onOpenPerda, onDispatchWhatsApp, onAddLead, onOpenProposta, onOpenReagendamento }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];
  const canDispatchWhatsApp = status !== "inactive" && status !== "registered";

  return (
    <div className="flex flex-col w-[280px] md:min-w-[300px] md:max-w-[320px] shrink-0 min-h-[600px]">
      <div className="flex items-center gap-2.5 px-2 py-3 mb-2">
        <div className={cn("w-2 h-2 rounded-sm shrink-0", STATUS_SQUARE_COLORS[status])} />
        <h3 className="font-medium text-sm text-slate-300">
          {config.label} <span className="text-slate-500">({leads.length})</span>
        </h3>
        <div className="flex-1" />
        <button onClick={onAddLead} className={cn("w-7 h-7 rounded-lg flex items-center justify-center", "text-slate-500 hover:text-primary hover:bg-primary/10", "transition-all duration-200")}>
          <Plus className="w-4 h-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1e1e22] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1e1e22] border-[#2a2a2e]">
            {canDispatchWhatsApp && leads.length > 0 && (
              <>
                <DropdownMenuItem className="text-green-400 focus:bg-green-500/10 focus:text-green-400" onClick={() => onDispatchWhatsApp?.(status)}>
                  <MessageSquare className="w-4 h-4 mr-2" />Disparar WhatsApp ({leads.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#2a2a2e]" />
              </>
            )}
            <DropdownMenuItem className="text-slate-200 focus:bg-slate-700/50">Ordenar por data</DropdownMenuItem>
            <DropdownMenuItem className="text-slate-200 focus:bg-slate-700/50">Ordenar por nome</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 p-2 space-y-2.5 rounded-xl overflow-y-auto scrollbar-subtle",
          "bg-[#18181b]/50",
          isOver && "bg-primary/10 ring-2 ring-primary/40"
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              isNew={newLeadIds?.has(lead.id)}
              hasCadenciaAtiva={cadenciaLeadIds?.has(lead.id)}
              onCancelCadencia={onCancelCadencia}
              onClick={() => onCardClick(lead)}
              onUpdateOrigin={onUpdateOrigin}
              onDelete={onDelete}
              onIniciarAtendimento={onIniciarAtendimento}
              onOpenAgendamento={onOpenAgendamento}
              onOpenComparecimento={onOpenComparecimento}
              onOpenVenda={onOpenVenda}
              onOpenPerda={onOpenPerda}
              onOpenProposta={onOpenProposta}
              onOpenReagendamento={onOpenReagendamento}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-slate-600 text-sm">Nenhum lead</div>
            <button onClick={onAddLead} className="mt-2 text-xs text-primary/70 hover:text-primary transition-colors">+ Adicionar</button>
          </div>
        )}
      </div>
    </div>
  );
}
