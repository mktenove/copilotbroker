import { useState } from "react";
import { LeadInteraction, STATUS_CONFIG, getOriginDisplayLabel, getOriginType } from "@/types/crm";
import {
  Clock, MessageSquare, MessageCircle, Send, FileText, CheckCircle, ArrowRight, MapPin,
  UserX, Bell, Calendar, DollarSign, Trophy, RefreshCw, Play, ChevronDown,
  ChevronUp, Zap, Globe, UserPlus, Megaphone, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadTimelineProps {
  interactions: LeadInteraction[];
  leadOrigin?: string | null;
  leadOriginDetail?: string | null;
  attribution?: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; landing_page?: string } | null;
  createdAt?: string;
  brokerName?: string | null;
}

const INTERACTION_META: Record<string, {
  icon: React.ElementType;
  label: string;
  color: string;
  dotColor: string;
  isHighlight?: boolean;
}> = {
  status_change: { icon: ArrowRight, label: "Mudança de Status", color: "text-slate-400", dotColor: "bg-slate-500" },
  note_added: { icon: MessageSquare, label: "Observação", color: "text-slate-400", dotColor: "bg-slate-500" },
  document_request: { icon: FileText, label: "Docs Solicitados", color: "text-slate-400", dotColor: "bg-slate-500" },
  document_received: { icon: CheckCircle, label: "Doc Recebido", color: "text-emerald-400", dotColor: "bg-emerald-500" },
  info_sent: { icon: Send, label: "Info Enviada", color: "text-slate-400", dotColor: "bg-slate-500" },
  contact_attempt: { icon: Clock, label: "Tentativa de Contato", color: "text-slate-400", dotColor: "bg-slate-500" },
  registration: { icon: CheckCircle, label: "Cadastro", color: "text-yellow-400", dotColor: "bg-yellow-500" },
  origin_change: { icon: MapPin, label: "Origem Alterada", color: "text-slate-400", dotColor: "bg-slate-500" },
  inactivation: { icon: UserX, label: "Lead Perdido", color: "text-red-400", dotColor: "bg-red-500", isHighlight: true },
  notification: { icon: Bell, label: "Notificação", color: "text-slate-400", dotColor: "bg-slate-500" },
  roleta_atribuicao: { icon: Zap, label: "Atribuição Roleta", color: "text-blue-400", dotColor: "bg-blue-500" },
  roleta_timeout: { icon: Clock, label: "Timeout Roleta", color: "text-orange-400", dotColor: "bg-orange-500" },
  roleta_fallback: { icon: ArrowRight, label: "Fallback Roleta", color: "text-orange-400", dotColor: "bg-orange-500" },
  roleta_transferencia: { icon: ArrowRight, label: "Transferência", color: "text-blue-400", dotColor: "bg-blue-500" },
  atendimento_iniciado: { icon: Play, label: "Atendimento Iniciado", color: "text-emerald-400", dotColor: "bg-emerald-500", isHighlight: true },
  agendamento_registrado: { icon: Calendar, label: "Agendamento", color: "text-yellow-400", dotColor: "bg-yellow-500", isHighlight: true },
  comparecimento_registrado: { icon: CheckCircle, label: "Comparecimento", color: "text-blue-400", dotColor: "bg-blue-500", isHighlight: true },
  proposta_enviada: { icon: DollarSign, label: "Proposta Enviada", color: "text-emerald-400", dotColor: "bg-emerald-500", isHighlight: true },
  venda_confirmada: { icon: Trophy, label: "Venda Confirmada", color: "text-yellow-400", dotColor: "bg-yellow-500", isHighlight: true },
  reagendamento: { icon: RefreshCw, label: "Reagendamento", color: "text-orange-400", dotColor: "bg-orange-500", isHighlight: true },
  whatsapp_manual: { icon: MessageCircle, label: "WhatsApp Manual", color: "text-emerald-400", dotColor: "bg-emerald-500", isHighlight: true },
};

const AUTOMATION_TYPES = new Set([
  "notification", "roleta_atribuicao", "roleta_timeout", "roleta_fallback"
]);

// Helper to detect cadência step notes
function isCadenciaNote(notes?: string | null): boolean {
  return !!notes && notes.startsWith("📤 Cadência");
}

// Helper to extract broker name from "Atendimento iniciado por X" notes
function extractBrokerFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/(?:iniciado|ativada?) por (.+?)$/i) 
    || notes.match(/Cadência 10D por (.+?)$/i);
  return match ? match[1] : null;
}

// Format time interval between two dates
function formatTimeInterval(laterDate: string, earlierDate: string): string | null {
  const diffMs = new Date(laterDate).getTime() - new Date(earlierDate).getTime();
  if (diffMs < 3600_000) return null; // less than 1h, skip

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d depois`;
  return `${diffHours}h depois`;
}

export function LeadTimeline({ interactions, leadOrigin, leadOriginDetail, attribution, createdAt, brokerName }: LeadTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 rounded-full bg-[#1a1a1e] flex items-center justify-center mb-3">
          <Clock className="w-4 h-4 text-slate-600" />
        </div>
        <p className="text-xs text-slate-600">Nenhuma interação registrada</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative">
      {/* Main timeline line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-[#2a2a2e] via-[#1e1e22] to-transparent" />

      <div className="space-y-1">
        {interactions.map((interaction, index) => {
          const isCadencia = isCadenciaNote(interaction.notes);
          const brokerFromNotes = interaction.interaction_type === "atendimento_iniciado"
            ? extractBrokerFromNotes(interaction.notes)
            : null;

          // Override meta for cadência steps
          const baseMeta = INTERACTION_META[interaction.interaction_type] || {
            icon: Clock, label: interaction.interaction_type, color: "text-slate-400", dotColor: "bg-slate-500", isHighlight: false
          };
          
          const meta = isCadencia ? {
            ...baseMeta,
            icon: Zap,
            color: "text-emerald-400",
            dotColor: "bg-emerald-500",
            isHighlight: true,
          } : baseMeta;

          const Icon = meta.icon;
          const isAuto = AUTOMATION_TYPES.has(interaction.interaction_type);
          const isExpanded = expandedIds.has(interaction.id);
          const hasDetails = !!interaction.notes || (interaction.old_status && interaction.new_status);

          // Time interval from next item (interactions are desc order)
          const nextInteraction = interactions[index + 1];
          const timeInterval = nextInteraction
            ? formatTimeInterval(interaction.created_at, nextInteraction.created_at)
            : null;

          return (
            <div key={interaction.id}>
              {/* Time interval indicator */}
              {timeInterval && (
                <div className="flex items-center gap-2 py-0.5 pl-6">
                  <div className="w-3 border-t border-dashed border-[#2a2a2e]" />
                  <span className="text-[9px] text-slate-600 font-medium tracking-wide uppercase">{timeInterval}</span>
                </div>
              )}

              <div
                className={cn(
                  "relative pl-8 py-2 group cursor-pointer rounded-lg transition-colors",
                  meta.isHighlight ? "hover:bg-[#1a1a1e]" : "hover:bg-[#141417]"
                )}
                onClick={() => hasDetails && toggleExpand(interaction.id)}
              >
                {/* Dot */}
                <div className={cn(
                  "absolute left-1.5 top-3.5 w-[9px] h-[9px] rounded-full ring-2 ring-[#111114] transition-all",
                  meta.dotColor,
                  meta.isHighlight && "ring-[3px] shadow-[0_0_6px_rgba(250,204,21,0.2)]"
                )} />

                {/* Content */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isAuto && (
                      <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-slate-600 bg-[#1a1a1e] px-1.5 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                    {isCadencia && (
                      <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Cadência
                      </span>
                    )}
                    <Icon className={cn("w-3 h-3 shrink-0", meta.color)} />
                    <span className={cn(
                      "text-xs font-medium truncate",
                      meta.isHighlight ? meta.color : "text-slate-300"
                    )}>
                      {isCadencia
                        ? (interaction.notes?.match(/Etapa \d+/)?.[0] || "Cadência 10D")
                        : meta.label}
                    </span>
                    {/* Broker name inline for atendimento_iniciado */}
                    {brokerFromNotes && (
                      <span className="text-[10px] text-emerald-500/80 font-medium truncate">
                        por {brokerFromNotes}
                      </span>
                    )}
                    {hasDetails && (
                      isExpanded
                        ? <ChevronUp className="w-3 h-3 text-slate-600 shrink-0" />
                        : <ChevronDown className="w-3 h-3 text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600 tabular-nums shrink-0">
                    {new Date(interaction.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && hasDetails && (
                  <div className="mt-2 ml-5 space-y-1.5 animate-fade-in">
                    {interaction.old_status && interaction.new_status && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium", 
                          STATUS_CONFIG[interaction.old_status]?.bgColor, 
                          STATUS_CONFIG[interaction.old_status]?.color
                        )}>
                          {STATUS_CONFIG[interaction.old_status]?.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium",
                          STATUS_CONFIG[interaction.new_status]?.bgColor,
                          STATUS_CONFIG[interaction.new_status]?.color
                        )}>
                          {STATUS_CONFIG[interaction.new_status]?.label}
                        </span>
                      </div>
                    )}
                    {interaction.notes && (
                      <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line break-words">{interaction.notes}</p>
                    )}
                    {interaction.channel && (
                      <p className="text-[10px] text-slate-600">Canal: {interaction.channel}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Origin card - first event chronologically, shown last */}
        {createdAt && (() => {
          const originType = getOriginType(leadOrigin);
          const isPaid = originType === 'paid';
          const isManual = originType === 'manual';
          const isOrganic = originType === 'organic';
          const originLabel = getOriginDisplayLabel(leadOrigin);

          const OriginIcon = isPaid ? Megaphone : isManual ? UserPlus : isOrganic ? Globe : HelpCircle;
          const dotColor = isPaid ? "bg-purple-500" : isManual ? "bg-yellow-500" : isOrganic ? "bg-green-500" : "bg-slate-500";
          const iconColor = isPaid ? "text-purple-400" : isManual ? "text-yellow-400" : isOrganic ? "text-green-400" : "text-slate-400";

          // Build detail line from UTM params
          const detailParts: string[] = [];
          if (leadOriginDetail) {
            detailParts.push(leadOriginDetail);
          } else {
            if (attribution?.utm_medium) detailParts.push(attribution.utm_medium);
            if (attribution?.utm_campaign) detailParts.push(attribution.utm_campaign);
          }
          if (attribution?.utm_content) detailParts.push(attribution.utm_content);
          if (attribution?.utm_term) detailParts.push(`📍 ${attribution.utm_term}`);

          let detail = detailParts.join(" · ");

          if (isManual && brokerName) {
            detail = detail ? `${detail} · por ${brokerName}` : `por ${brokerName}`;
          }

          // Time interval from last interaction to creation
          const lastInteraction = interactions[interactions.length - 1];
          const originInterval = lastInteraction
            ? formatTimeInterval(lastInteraction.created_at, createdAt)
            : null;

          return (
            <>
              {originInterval && (
                <div className="flex items-center gap-2 py-0.5 pl-6">
                  <div className="w-3 border-t border-dashed border-[#2a2a2e]" />
                  <span className="text-[9px] text-slate-600 font-medium tracking-wide uppercase">{originInterval}</span>
                </div>
              )}
              <div className="relative pl-8 py-2.5 rounded-lg bg-[#12121a] border border-[#1e1e22] mt-1">
                {/* Dot */}
                <div className={cn(
                  "absolute left-1.5 top-4 w-[9px] h-[9px] rounded-full ring-[3px] ring-[#12121a]",
                  dotColor, "shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                )} />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <OriginIcon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />
                    <span className={cn("text-xs font-semibold", iconColor)}>
                      {leadOrigin ? originLabel : "Origem não identificada"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 tabular-nums shrink-0">
                    {new Date(createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>

                {detail && (
                  <p className="mt-1 ml-5.5 text-[11px] text-slate-500 break-words">{detail}</p>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
