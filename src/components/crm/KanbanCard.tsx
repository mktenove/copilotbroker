import { useMemo } from "react";
import { Phone, User, Calendar, Clock, Edit2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CRMLead, STATUS_CONFIG } from "@/types/crm";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  lead: CRMLead;
  onClick: () => void;
}

export function KanbanCard({ lead, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const statusConfig = STATUS_CONFIG[lead.status];

  const timeSinceInteraction = useMemo(() => {
    const date = lead.last_interaction_at ? new Date(lead.last_interaction_at) : new Date(lead.created_at);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 dia atrás";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return new Date(lead.created_at).toLocaleDateString("pt-BR");
  }, [lead.last_interaction_at, lead.created_at]);

  const isStale = useMemo(() => {
    const date = lead.last_interaction_at ? new Date(lead.last_interaction_at) : new Date(lead.created_at);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours > 48;
  }, [lead.last_interaction_at, lead.created_at]);

  const cleanPhone = lead.whatsapp.replace(/\D/g, "");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/30 transition-all",
        isDragging && "opacity-50 shadow-lg rotate-2",
        isStale && "ring-2 ring-red-200"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-foreground text-sm leading-tight line-clamp-2">
          {lead.name}
        </h4>
        {isStale && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded">
            !
          </span>
        )}
      </div>

      {/* Phone with WhatsApp link */}
      <a
        href={`https://wa.me/55${cleanPhone}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-600 transition-colors mb-2"
      >
        <Phone className="w-3 h-3" />
        <span>{lead.whatsapp}</span>
      </a>

      {/* Source badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          "px-2 py-0.5 text-[10px] font-medium rounded-full",
          lead.source === "enove" 
            ? "bg-primary/10 text-primary" 
            : "bg-accent text-accent-foreground"
        )}>
          {lead.source === "enove" ? "Enove" : lead.source}
        </span>
      </div>

      {/* Broker info (for admin view) */}
      {lead.broker && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <User className="w-3 h-3" />
          <span className="truncate">{lead.broker.name}</span>
        </div>
      )}

      {/* Footer with time info */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeSinceInteraction}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
    </div>
  );
}
