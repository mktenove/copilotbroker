import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CRMLead, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: LeadStatus;
  leads: CRMLead[];
  onCardClick: (lead: CRMLead) => void;
  onUpdateOrigin?: (leadId: string, origin: string) => Promise<void>;
  onInactivate?: (leadId: string, reason: string) => Promise<void>;
  onDelete?: (leadId: string) => Promise<void>;
}

// Status dot colors for TaskWhiz style headers
const STATUS_DOT_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  info_sent: "bg-amber-500",
  awaiting_docs: "bg-orange-500",
  docs_received: "bg-emerald-500",
  registered: "bg-slate-400",
  inactive: "bg-red-500"
};

export function KanbanColumn({ status, leads, onCardClick, onUpdateOrigin, onInactivate, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col min-w-[300px] max-w-[320px] shrink-0">
      {/* Column Header - TaskWhiz minimalist style */}
      <div className="flex items-center gap-2 px-3 py-3 mb-3">
        {/* Status dot */}
        <div className={cn(
          "w-2.5 h-2.5 rounded-full shrink-0",
          STATUS_DOT_COLORS[status]
        )} />
        
        {/* Column title */}
        <h3 className="font-medium text-sm text-slate-200 truncate">
          {config.label}
        </h3>
        
        {/* Lead counter - pill style */}
        <span className={cn(
          "ml-auto px-2 py-0.5 text-xs font-semibold rounded-full",
          "bg-slate-700/80 text-slate-300"
        )}>
          {leads.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-3 rounded-xl min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto",
          "bg-[#1e1e38]/50",
          "scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent",
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
          <div className="flex items-center justify-center h-32 text-sm text-slate-500 border-2 border-dashed border-slate-700/50 rounded-xl">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
}
