import { LeadInteraction, STATUS_CONFIG, getInactivationReasonLabel } from "@/types/crm";
import { Clock, MessageSquare, Send, FileText, CheckCircle, ArrowRight, MapPin, UserX, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadTimelineProps {
  interactions: LeadInteraction[];
}

const INTERACTION_ICONS: Record<string, React.ElementType> = {
  status_change: ArrowRight,
  note_added: MessageSquare,
  document_request: FileText,
  document_received: CheckCircle,
  info_sent: Send,
  contact_attempt: Clock,
  registration: CheckCircle,
  origin_change: MapPin,
  inactivation: UserX,
  notification: Bell
};

const INTERACTION_LABELS: Record<string, string> = {
  status_change: "Mudança de Status",
  note_added: "Observação",
  document_request: "Documentos Solicitados",
  document_received: "Documento Recebido",
  info_sent: "Informações Enviadas",
  contact_attempt: "Tentativa de Contato",
  registration: "Cadastro no Ábaco",
  origin_change: "Origem Alterada",
  inactivation: "Lead Inativado",
  notification: "Notificação Enviada"
};

export function LeadTimeline({ interactions }: LeadTimelineProps) {
  if (interactions.length === 0) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-400">Histórico</h4>
        <p className="text-sm text-slate-500 text-center py-4">
          Nenhuma interação registrada
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-400">Histórico</h4>
      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-700/50" />

        {interactions.map((interaction, index) => {
          const Icon = INTERACTION_ICONS[interaction.interaction_type] || Clock;
          const label = INTERACTION_LABELS[interaction.interaction_type] || interaction.interaction_type;

          // Detect success/failure for contact_attempt
          const isContactAttempt = interaction.interaction_type === "contact_attempt";
          const isSuccess = isContactAttempt && interaction.notes?.includes("✅");
          const isFailure = isContactAttempt && (interaction.notes?.includes("❌") || interaction.notes?.includes("Falha"));

          // Determine icon border color
          const getIconBorderColor = () => {
            if (interaction.interaction_type === "inactivation") return "border-red-500";
            if (isFailure) return "border-red-400";
            if (isSuccess) return "border-emerald-500";
            if (interaction.interaction_type === "notification") return "border-emerald-500";
            if (interaction.interaction_type === "registration") return "border-[#FFFF00]";
            return "border-slate-500";
          };

          // Determine icon text color
          const getIconTextColor = () => {
            if (interaction.interaction_type === "inactivation") return "text-red-500";
            if (isFailure) return "text-red-400";
            if (isSuccess) return "text-emerald-500";
            if (interaction.interaction_type === "notification") return "text-emerald-500";
            if (interaction.interaction_type === "registration") return "text-[#FFFF00]";
            return "text-slate-400";
          };

          // Determine card bg/border
          const getCardStyle = () => {
            if (interaction.interaction_type === "inactivation") return "bg-red-500/10 border-red-500/30";
            if (isFailure) return "bg-red-500/10 border-red-400/30";
            if (isSuccess) return "bg-emerald-500/10 border-emerald-500/30";
            if (interaction.interaction_type === "notification") return "bg-emerald-500/10 border-emerald-500/30";
            return "bg-[#0f0f12] border-[#2a2a2e]";
          };

          return (
            <div key={interaction.id} className="relative pl-10 pb-4">
              {/* Icon circle */}
              <div className={cn(
                "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center",
                "bg-[#1e1e22] border-2",
                getIconBorderColor()
              )}>
                <Icon className={cn("w-3 h-3", getIconTextColor())} />
              </div>

              {/* Content */}
              <div className={cn(
                "rounded-lg p-3 border",
                getCardStyle()
              )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-300">{label}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(interaction.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>

                {/* Status change display */}
                {interaction.interaction_type === "status_change" && interaction.old_status && interaction.new_status && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn("px-1.5 py-0.5 rounded", STATUS_CONFIG[interaction.old_status].bgColor, STATUS_CONFIG[interaction.old_status].color)}>
                      {STATUS_CONFIG[interaction.old_status].label}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className={cn("px-1.5 py-0.5 rounded", STATUS_CONFIG[interaction.new_status].bgColor, STATUS_CONFIG[interaction.new_status].color)}>
                      {STATUS_CONFIG[interaction.new_status].label}
                    </span>
                  </div>
                )}

                {/* Channel info */}
                {interaction.channel && (
                  <p className="text-xs text-slate-500 mt-1">
                    Canal: {interaction.channel}
                  </p>
                )}

                {/* Notes */}
                {interaction.notes && (
                  <p className="text-xs text-slate-400 mt-1">
                    {interaction.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
