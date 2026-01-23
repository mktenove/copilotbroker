import { useMemo, useState } from "react";
import { User, Clock, MessageCircle, MapPin, Plus, UserX, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CRMLead, STATUS_CONFIG, getOriginDisplayLabel, getOriginType, ORIGIN_TYPE_COLORS } from "@/types/crm";
import { cn } from "@/lib/utils";
import { OriginQuickPicker } from "./OriginQuickPicker";
import { InactivationPicker } from "./InactivationPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface KanbanCardProps {
  lead: CRMLead;
  onClick: () => void;
  onUpdateOrigin?: (leadId: string, origin: string) => Promise<void>;
  onInactivate?: (leadId: string, reason: string) => Promise<void>;
  onDelete?: (leadId: string) => Promise<void>;
}

export function KanbanCard({ lead, onClick, onUpdateOrigin, onInactivate, onDelete }: KanbanCardProps) {
  const [isOriginPickerOpen, setIsOriginPickerOpen] = useState(false);
  const [isInactivationPickerOpen, setIsInactivationPickerOpen] = useState(false);
  
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

  // Get initials from name
  const initials = useMemo(() => {
    const parts = lead.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [lead.name]);

  const timeSinceInteraction = useMemo(() => {
    const date = lead.last_interaction_at ? new Date(lead.last_interaction_at) : new Date(lead.created_at);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1d";
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}sem`;
  }, [lead.last_interaction_at, lead.created_at]);

  const isStale = useMemo(() => {
    const date = lead.last_interaction_at ? new Date(lead.last_interaction_at) : new Date(lead.created_at);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours > 48;
  }, [lead.last_interaction_at, lead.created_at]);

  const cleanPhone = lead.whatsapp.replace(/\D/g, "");

  const handleOriginClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOriginPickerOpen(true);
  };

  const handleOriginSelect = async (origin: string) => {
    if (onUpdateOrigin) {
      await onUpdateOrigin(lead.id, origin);
    }
  };

  const handleInactivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsInactivationPickerOpen(true);
  };

  const handleInactivateConfirm = async (reason: string) => {
    if (onInactivate) {
      await onInactivate(lead.id, reason);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={cn(
          "card-premium cursor-grab active:cursor-grabbing group relative overflow-hidden",
          isDragging && "opacity-70 shadow-2xl rotate-2 scale-105 z-50",
          isStale && "ring-1 ring-primary/50"
        )}
      >
        {/* Premium status indicator - top gradient bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-2xl",
          "bg-gradient-to-r from-primary/60 via-primary to-primary/60"
        )} />

        {/* Header: Avatar + Name + Actions */}
        <div className="flex items-start gap-3 mb-3 pt-1">
          {/* Avatar with initials */}
          <div className="avatar-gold shrink-0">
            {initials}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {lead.name}
            </h4>
            
            {/* Source badge */}
            <span className="inline-block mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              via {lead.source === "enove" ? "Enove" : lead.source}
            </span>
          </div>

          {/* Time + Stale indicator */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className={cn(
              "flex items-center gap-1 text-xs",
              isStale ? "text-primary font-semibold" : "text-muted-foreground"
            )}>
              <Clock className="w-3 h-3" />
              <span>{timeSinceInteraction}</span>
            </div>
            {isStale && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
        </div>

        {/* Origin badge */}
        <div className="mb-3">
          {lead.lead_origin ? (
            <button
              onClick={handleOriginClick}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium",
                "hover:opacity-80 transition-opacity",
                ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
              )}
            >
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{getOriginDisplayLabel(lead.lead_origin)}</span>
            </button>
          ) : (
            <button
              onClick={handleOriginClick}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed",
                "text-xs text-muted-foreground hover:text-primary hover:border-primary/50",
                "transition-colors bg-muted/30 hover:bg-primary/5"
              )}
            >
              <Plus className="w-3 h-3" />
              <span>Adicionar origem</span>
            </button>
          )}
        </div>

        {/* Broker info */}
        {lead.broker && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{lead.broker.name}</span>
          </div>
        )}

        {/* WhatsApp Button - Premium style */}
        <a
          href={`https://wa.me/55${cleanPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="btn-whatsapp-premium mb-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>

        {/* Action buttons overlay - appears on hover */}
        <div className={cn(
          "absolute bottom-2 right-2 flex items-center gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        )}>
          <button
            onClick={handleInactivateClick}
            className={cn(
              "p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50",
              "text-muted-foreground hover:text-destructive hover:border-destructive/30",
              "transition-colors"
            )}
            title="Inativar lead"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
          
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50",
                    "text-muted-foreground hover:text-destructive hover:border-destructive/30",
                    "transition-colors"
                  )}
                  title="Excluir lead"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O lead <strong>{lead.name}</strong> será excluído permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(lead.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Pickers */}
      <OriginQuickPicker
        leadId={lead.id}
        leadName={lead.name}
        currentOrigin={lead.lead_origin}
        isOpen={isOriginPickerOpen}
        onClose={() => setIsOriginPickerOpen(false)}
        onSelect={handleOriginSelect}
      />

      <InactivationPicker
        leadId={lead.id}
        leadName={lead.name}
        isOpen={isInactivationPickerOpen}
        onClose={() => setIsInactivationPickerOpen(false)}
        onConfirm={handleInactivateConfirm}
      />
    </>
  );
}
