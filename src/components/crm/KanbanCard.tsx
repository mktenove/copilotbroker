import { useMemo } from "react";
import { Clock, MessageCircle, Plus, UserX, Trash2, Mail, Phone, ChevronRight, CheckCircle2, Lock, RotateCw, Timer, AlertTriangle, Play } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CRMLead, LeadStatus, STATUS_CONFIG, getOriginDisplayLabel, getOriginType } from "@/types/crm";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { OriginCombobox } from "./OriginCombobox";
import { InactivationCombobox } from "./InactivationCombobox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  onAdvanceStatus?: (leadId: string, currentStatus: LeadStatus) => Promise<void>;
  onStartService?: (leadId: string) => Promise<void>;
}

// Status order for advancement
const STATUS_ORDER: LeadStatus[] = ['new', 'info_sent', 'docs_received', 'registered'];

const getNextStatus = (currentStatus: LeadStatus): LeadStatus | null => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[currentIndex + 1];
};

const getNextStatusLabel = (currentStatus: LeadStatus): string | null => {
  const nextStatus = getNextStatus(currentStatus);
  if (!nextStatus) return null;
  return STATUS_CONFIG[nextStatus]?.label || null;
};

// Vibrant dark theme colors for origin types
const ORIGIN_COLORS: Record<string, string> = {
  paid: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  organic: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  referral: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  manual: "bg-enove-yellow/20 text-enove-yellow border-enove-yellow/40",
  unknown: "bg-slate-500/20 text-slate-400 border-slate-500/40",
};

// Progress percentage by status
const STATUS_PROGRESS: Record<string, number> = {
  new: 15,
  info_sent: 40,
  docs_received: 70,
  registered: 100,
  inactive: 0
};

// Progress bar colors by status
const PROGRESS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  info_sent: "bg-enove-yellow",
  docs_received: "bg-emerald-500",
  registered: "bg-slate-400",
  inactive: "bg-red-500"
};

export function KanbanCard({ lead, onClick, onUpdateOrigin, onInactivate, onDelete, onAdvanceStatus, onStartService }: KanbanCardProps) {
  const isMobile = useIsMobile();
  const nextStatus = getNextStatus(lead.status);
  const nextStatusLabel = getNextStatusLabel(lead.status);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id, disabled: isMobile });

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

  const createdAtWithTime = useMemo(() => {
    const date = new Date(lead.created_at);
    const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${day} ${time}`;
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
  const originType = getOriginType(lead.lead_origin);
  const progress = STATUS_PROGRESS[lead.status] || 0;

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
        {...(isMobile ? {} : { ...attributes, ...listeners })}
        onClick={onClick}
        className={cn(
          "relative rounded-xl",
          isMobile ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
          "bg-[#1e1e22] border border-[#2a2a2e]",
          "hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
          "transition-all duration-200 ease-out",
          "group overflow-hidden",
          isDragging && "opacity-70 shadow-2xl rotate-1 scale-105 z-50",
          isStale && "ring-2 ring-red-400/50"
        )}
      >
        <div className="p-3">
        {/* Row 1: Project Name + Date/Time */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {lead.project ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-primary/20 text-primary border border-primary/40">
                {lead.project.name}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500 border border-dashed border-slate-600">
                Sem projeto
              </span>
            )}
            <span className="text-[10px] text-slate-500 shrink-0">
              {createdAtWithTime}
            </span>
          </div>

          {/* Row 2: Contextual badges (only renders if any exist) */}
          {(lead.roleta_id || lead.status_distribuicao === 'fallback_lider' || lead.auto_first_message_sent || lead.attribution?.landing_page === "admin_manual" || isStale) && (
            <div className="flex flex-wrap items-center gap-1 mb-2">
              {lead.roleta_id && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <RotateCw className="w-2.5 h-2.5" />
                  Roleta
                </span>
              )}
              {lead.status_distribuicao === 'fallback_lider' && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Fallback
                </span>
              )}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {lead.auto_first_message_sent ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        1ª msg
                      </span>
                    ) : lead.attribution?.landing_page === "admin_manual" ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[9px] font-medium">
                        <Lock className="w-3 h-3" />
                        Manual
                      </span>
                    ) : null}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-[#1e1e22] border-[#2a2a2e] text-xs">
                    {lead.auto_first_message_sent ? (
                      <span className="text-emerald-300">Primeira mensagem automática enviada</span>
                    ) : lead.attribution?.landing_page === "admin_manual" ? (
                      <span className="text-slate-300">Origem manual - sem automação</span>
                    ) : null}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isStale && (
                <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                  !
                </span>
              )}
            </div>
          )}

          {/* Row 2: Lead Name */}
          <h4 className="font-semibold text-white text-sm leading-snug line-clamp-1 mb-2 group-hover:text-primary transition-colors">
            {lead.name}
          </h4>

          {/* Row 3: Contact Info */}
          <div className="space-y-1 mb-3">
            {/* WhatsApp */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{formatPhone(lead.whatsapp)}</span>
            </div>
            
            {/* Email */}
            {lead.email && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail className="w-3 h-3 text-slate-500" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>

          {/* Row 4: Progress Bar */}
          <div className="mb-3">
            <div className="h-1 w-full bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", PROGRESS_COLORS[lead.status])}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Row 5: WhatsApp / Iniciar Atendimento Button + Actions - touch friendly */}
          <div className="flex items-center gap-2 mb-3">
            {lead.roleta_id && lead.status_distribuicao !== 'atendimento_iniciado' && onStartService ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartService(lead.id).then(() => {
                    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                  });
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 min-h-[40px] md:min-h-0 md:py-1.5",
                  "bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-lg",
                  "font-medium text-xs transition-all duration-150",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "shadow-sm"
                )}
              >
                <MessageCircle className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Iniciar Atendimento</span>
              </button>
            ) : (
              <a
                href={`https://wa.me/55${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 min-h-[40px] md:min-h-0 md:py-1.5",
                  "bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-lg",
                  "font-medium text-xs transition-all duration-150",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "shadow-sm"
                )}
              >
                <MessageCircle className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {/* Action buttons - touch friendly */}
            <div className="flex items-center gap-1 ml-auto">
              <InactivationCombobox
                onConfirm={handleInactivateConfirm}
                trigger={
                  <button
                    className={cn(
                      "p-2 md:p-1.5 rounded-md min-w-[40px] min-h-[40px] md:min-w-0 md:min-h-0",
                      "flex items-center justify-center",
                      "text-slate-500 hover:text-red-400 hover:bg-red-500/10",
                      "transition-colors"
                    )}
                    title="Inativar lead"
                  >
                    <UserX className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                }
              />
              
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "p-2 md:p-1.5 rounded-md min-w-[40px] min-h-[40px] md:min-w-0 md:min-h-0",
                        "flex items-center justify-center",
                        "text-slate-500 hover:text-red-400 hover:bg-red-500/10",
                        "transition-colors"
                      )}
                      title="Excluir lead"
                    >
                      <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
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

              {/* Advance Status Button */}
              {onAdvanceStatus && nextStatus && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvanceStatus(lead.id, lead.status);
                  }}
                  className={cn(
                    "p-2 md:p-1.5 rounded-md min-w-[40px] min-h-[40px] md:min-w-0 md:min-h-0",
                    "flex items-center justify-center",
                    "text-slate-500 hover:text-primary hover:bg-primary/10",
                    "transition-colors"
                  )}
                  title={`Avançar para: ${nextStatusLabel}`}
                >
                  <ChevronRight className="w-4 h-4 md:w-3.5 md:h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 6: Footer with avatar, time and origin */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              {/* Broker avatar */}
              <Avatar className="w-5 h-5 border border-[#2a2a2e]">
                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white text-[9px] font-medium">
                  {lead.broker?.name?.charAt(0) || (lead.source === "enove" ? "E" : "?")}
                </AvatarFallback>
              </Avatar>

              {/* Broker name */}
              <span 
                className="text-[10px] text-slate-400 max-w-[70px] truncate" 
                title={lead.broker?.name || "Enove"}
              >
                {lead.broker?.name || "Enove"}
              </span>

              {/* Separator */}
              <span className="text-slate-600">•</span>

              {/* Last interaction time */}
              <div className="flex items-center gap-1 text-[10px] text-slate-500" title="Última interação">
                <Clock className="w-3 h-3" />
                <span>{timeSinceInteraction}</span>
              </div>
            </div>
            
            {/* Origin Combobox with campaign tooltip */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <OriginCombobox
                      currentOrigin={lead.lead_origin}
                      onSelect={handleOriginSelect}
                      trigger={
                        lead.lead_origin ? (
                          <button
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                              "hover:opacity-80 transition-opacity border",
                              ORIGIN_COLORS[originType]
                            )}
                          >
                            {getOriginDisplayLabel(lead.lead_origin)}
                          </button>
                        ) : (
                          <button
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                              "text-slate-500 hover:text-slate-300 border border-dashed border-slate-600",
                              "hover:border-slate-400 transition-colors"
                            )}
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Origem
                          </button>
                        )
                      }
                    />
                  </div>
                </TooltipTrigger>
                {(lead as any).lead_origin_detail && (
                  <TooltipContent side="top" className="bg-[#1e1e22] border-[#2a2a2e] text-xs max-w-[250px]">
                    <span className="text-slate-300">{(lead as any).lead_origin_detail}</span>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

    </>
  );
}
