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

export function KanbanColumn({ status, leads, onCardClick, onUpdateOrigin, onInactivate, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  return (
    <div className="kanban-column-premium">
      {/* Premium Column Header */}
      <div className="column-header-premium">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label={config.label}>
            {config.icon}
          </span>
          <h3 className={cn("font-serif font-semibold text-sm", config.color)}>
            {config.label}
          </h3>
        </div>
        <span className={cn(
          "px-2.5 py-1 text-xs font-bold rounded-full",
          "bg-primary/15 text-primary"
        )}>
          {leads.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 space-y-3 min-h-[300px] max-h-[calc(100vh-280px)] overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
          isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
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
            <span className="text-2xl mb-2 opacity-50">{config.icon}</span>
            <span className="text-sm text-muted-foreground">Nenhum lead</span>
          </div>
        )}
      </div>
    </div>
  );
}
