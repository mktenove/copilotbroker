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
}

export function KanbanColumn({ status, leads, onCardClick, onUpdateOrigin, onInactivate }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] shrink-0">
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 rounded-t-lg border",
        config.bgColor
      )}>
        <h3 className={cn("font-medium text-sm", config.color)}>
          {config.label}
        </h3>
        <span className={cn(
          "px-2 py-0.5 text-xs font-semibold rounded-full",
          config.color,
          "bg-white/60"
        )}>
          {leads.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 bg-muted/30 rounded-b-lg border border-t-0 min-h-[300px] max-h-[calc(100vh-280px)] overflow-y-auto",
          isOver && "bg-primary/5 ring-2 ring-primary/30"
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
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
}
