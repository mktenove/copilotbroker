import { LeadInteraction, STATUS_CONFIG, getInactivationReasonLabel } from "@/types/crm";
import { Clock, MessageSquare, Send, FileText, CheckCircle, ArrowRight, MapPin, UserX } from "lucide-react";
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
  inactivation: UserX
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
  inactivation: "Lead Inativado"
};

export function LeadTimeline({ interactions }: LeadTimelineProps) {
  if (interactions.length === 0) {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-foreground">Histórico</h4>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma interação registrada
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-foreground">Histórico</h4>
      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

        {interactions.map((interaction, index) => {
          const Icon = INTERACTION_ICONS[interaction.interaction_type] || Clock;
          const label = INTERACTION_LABELS[interaction.interaction_type] || interaction.interaction_type;

          return (
            <div key={interaction.id} className="relative pl-10 pb-4">
              {/* Icon circle */}
              <div className={cn(
                "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center",
                "bg-background border-2",
                interaction.interaction_type === "inactivation" 
                  ? "border-destructive" 
                  : "border-primary"
              )}>
                <Icon className={cn(
                  "w-3 h-3",
                  interaction.interaction_type === "inactivation" 
                    ? "text-destructive" 
                    : "text-primary"
                )} />
              </div>

              {/* Content */}
              <div className={cn(
                "rounded-lg p-3",
                interaction.interaction_type === "inactivation"
                  ? "bg-destructive/10 border border-destructive/20"
                  : "bg-muted/50"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <span className="text-[10px] text-muted-foreground">
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
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className={cn("px-1.5 py-0.5 rounded", STATUS_CONFIG[interaction.new_status].bgColor, STATUS_CONFIG[interaction.new_status].color)}>
                      {STATUS_CONFIG[interaction.new_status].label}
                    </span>
                  </div>
                )}

                {/* Channel info */}
                {interaction.channel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Canal: {interaction.channel}
                  </p>
                )}

                {/* Notes */}
                {interaction.notes && (
                  <p className="text-xs text-muted-foreground mt-1">
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
