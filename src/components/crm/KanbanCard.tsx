import { useMemo } from "react";
import { Phone, User, Calendar, Clock, MessageCircle, MapPin } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CRMLead, STATUS_CONFIG, getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS } from "@/types/crm";
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
        "relative bg-card border border-border rounded-xl p-4 cursor-grab active:cursor-grabbing",
        "hover:shadow-lg hover:border-primary/40 hover:-translate-y-1",
        "transition-all duration-200 ease-out",
        "group overflow-hidden",
        isDragging && "opacity-60 shadow-xl rotate-3 scale-105",
        isStale && "ring-2 ring-red-300 dark:ring-red-400/50"
      )}
    >
      {/* Status indicator bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
        statusConfig?.bgColor || "bg-muted"
      )} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3 pl-2">
        <h4 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {lead.name}
        </h4>
        {isStale && (
          <span className="shrink-0 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
            !
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 pl-2">
        {/* Cadastrado por badge */}
        <span className={cn(
          "px-2 py-0.5 text-xs font-medium rounded-full",
          "bg-primary/15 text-primary border border-primary/20"
        )}>
          {lead.source === "enove" ? "Enove" : lead.source}
        </span>
        
        {/* Origem badge - dinâmico com cores por tipo */}
        {lead.lead_origin && (
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full border flex items-center gap-1 max-w-[150px]",
            ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
          )}>
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{getOriginDisplayLabel(lead.lead_origin)}</span>
          </span>
        )}
        
        {/* Broker badge */}
        {lead.broker && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{lead.broker.name}</span>
          </span>
        )}
      </div>

      {/* WhatsApp Button - Prominent */}
      <a
        href={`https://wa.me/55${cleanPhone}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex items-center justify-center gap-2 w-full py-2.5 px-3 mb-3 ml-2 mr-2",
          "bg-green-500 hover:bg-green-600 text-white rounded-lg",
          "font-medium text-sm transition-all duration-150",
          "hover:scale-[1.02] active:scale-[0.98]",
          "shadow-sm hover:shadow-md",
          "w-[calc(100%-0.5rem)]"
        )}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Chamar no WhatsApp</span>
      </a>

      {/* Footer with time info */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/30 pl-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeSinceInteraction}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          <Calendar className="w-3.5 h-3.5" />
          <span>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
    </div>
  );
}
