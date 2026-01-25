import { useMemo, useState } from "react";
import { User, Clock, MessageCircle, MapPin, Plus, UserX, Trash2, Mail, Phone, Eye, MessageSquare } from "lucide-react";
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

// Dark theme colors for status sidebar
const STATUS_SIDEBAR_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  info_sent: "bg-amber-500",
  awaiting_docs: "bg-orange-500",
  docs_received: "bg-emerald-500",
  registered: "bg-slate-400",
  inactive: "bg-red-500"
};

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

  const timeSinceInteraction = useMemo(() => {
    const date = lead.last_interaction_at ? new Date(lead.last_interaction_at) : new Date(lead.created_at);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 dia";
    if (diffDays < 7) return `${diffDays} dias`;
    return new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }, [lead.last_interaction_at, lead.created_at]);

  const createdAtFormatted = useMemo(() => {
    const date = new Date(lead.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }, [lead.created_at]);

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

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

  const handleInactivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsInactivationPickerOpen(true);
  };

  const handleOriginSelect = async (origin: string) => {
    if (onUpdateOrigin) {
      await onUpdateOrigin(lead.id, origin);
    }
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
          // Base card styles - TaskWhiz dark theme
          "relative rounded-xl cursor-grab active:cursor-grabbing",
          "bg-[#252545] border border-[#3a3a5c]",
          "hover:border-primary/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
          "transition-all duration-200 ease-out",
          "group overflow-hidden",
          isDragging && "opacity-70 shadow-2xl rotate-2 scale-105 z-50",
          isStale && "ring-2 ring-red-400/60"
        )}
      >
        {/* Status indicator sidebar - 3px */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl",
          STATUS_SIDEBAR_COLORS[lead.status] || "bg-slate-500"
        )} />

        <div className="p-3 pl-4">
          {/* Row 1: Tags + Date */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Origin Tag */}
              {lead.lead_origin ? (
                <button
                  onClick={handleOriginClick}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                    "hover:opacity-80 transition-opacity border",
                    ORIGIN_TYPE_COLORS[getOriginType(lead.lead_origin)]
                  )}
                >
                  {getOriginDisplayLabel(lead.lead_origin)}
                </button>
              ) : (
                <button
                  onClick={handleOriginClick}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                    "text-slate-400 hover:text-slate-200 border border-dashed border-slate-600",
                    "hover:border-slate-400 transition-colors"
                  )}
                >
                  <Plus className="w-2.5 h-2.5" />
                  Origem
                </button>
              )}
              
              {/* Broker/Source Tag */}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-700/60 text-slate-300 border border-slate-600">
                <User className="w-2.5 h-2.5" />
                {lead.broker?.name || (lead.source === "enove" ? "Enove" : lead.source)}
              </span>

              {/* Stale indicator */}
              {isStale && (
                <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                  !
                </span>
              )}
            </div>

            {/* Date */}
            <span className="text-[10px] text-slate-500 shrink-0">
              {createdAtFormatted}
            </span>
          </div>

          {/* Row 2: Lead Name */}
          <h4 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {lead.name}
          </h4>

          {/* Row 3: Contact Info */}
          <div className="space-y-1 mb-3">
            {/* WhatsApp */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatPhone(lead.whatsapp)}</span>
            </div>
            
            {/* Email */}
            {lead.email && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>

          {/* Row 4: WhatsApp Button + Actions */}
          <div className="flex items-center gap-2 mb-3">
            <a
              href={`https://wa.me/55${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5",
                "bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-lg",
                "font-medium text-xs transition-all duration-150",
                "hover:scale-[1.02] active:scale-[0.98]",
                "shadow-sm"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            {/* Action buttons */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={handleInactivateClick}
                className={cn(
                  "p-1.5 rounded-md",
                  "text-slate-400 hover:text-red-400 hover:bg-red-500/10",
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
                        "p-1.5 rounded-md",
                        "text-slate-400 hover:text-red-400 hover:bg-red-500/10",
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
                        Esta ação não pode ser desfeita. O lead <strong>{lead.name}</strong> e todos os dados relacionados serão excluídos permanentemente.
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

          {/* Row 5: Footer with time and project */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              {/* Last interaction */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400" title="Última interação">
                <Clock className="w-3 h-3" />
                <span>{timeSinceInteraction}</span>
              </div>
            </div>
            
            {lead.project && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{lead.project.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Origin Quick Picker */}
      <OriginQuickPicker
        leadId={lead.id}
        leadName={lead.name}
        currentOrigin={lead.lead_origin}
        isOpen={isOriginPickerOpen}
        onClose={() => setIsOriginPickerOpen(false)}
        onSelect={handleOriginSelect}
      />

      {/* Inactivation Picker */}
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
