import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreHorizontal } from "lucide-react";
import { CRMLead, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanColumnProps {
  status: LeadStatus;
  leads: CRMLead[];
  onCardClick: (lead: CRMLead) => void;
  onUpdateOrigin?: (leadId: string, origin: string) => Promise<void>;
  onInactivate?: (leadId: string, reason: string) => Promise<void>;
  onDelete?: (leadId: string) => Promise<void>;
}

// Status square colors for TaskWhiz style headers
const STATUS_SQUARE_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  info_sent: "bg-enove-yellow",
  awaiting_docs: "bg-enove-yellow",
  docs_received: "bg-emerald-500",
  registered: "bg-slate-400",
  inactive: "bg-red-500"
};

export function KanbanColumn({ status, leads, onCardClick, onUpdateOrigin, onInactivate, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col w-[280px] md:min-w-[300px] md:max-w-[320px] shrink-0 min-h-[600px]">
      {/* Column Header - TaskWhiz minimalist style with square indicator */}
      <div className="flex items-center gap-2.5 px-2 py-3 mb-2">
        {/* Status square (not dot) */}
        <div className={cn(
          "w-2 h-2 rounded-sm shrink-0",
          STATUS_SQUARE_COLORS[status]
        )} />
        
        {/* Column title with count in parentheses */}
        <h3 className="font-medium text-sm text-slate-300">
          {config.label} <span className="text-slate-500">({leads.length})</span>
        </h3>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add button - icon only */}
        <button
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center",
            "text-slate-500 hover:text-primary hover:bg-primary/10",
            "transition-all duration-200"
          )}
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Column menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1e1e22] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1e1e22] border-[#2a2a2e]">
            <DropdownMenuItem className="text-slate-200 focus:bg-slate-700/50">
              Ordenar por data
            </DropdownMenuItem>
            <DropdownMenuItem className="text-slate-200 focus:bg-slate-700/50">
              Ordenar por nome
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column Content - more transparent background */}
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
              onClick={() => onCardClick(lead)}
              onUpdateOrigin={onUpdateOrigin}
              onInactivate={onInactivate}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-slate-600 text-sm">Nenhum lead</div>
            <button className="mt-2 text-xs text-primary/70 hover:text-primary transition-colors">
              + Adicionar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
