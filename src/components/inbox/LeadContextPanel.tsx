import { useNavigate } from "react-router-dom";
import { X, Phone, Mail, MapPin, Calendar, FileText, ChevronRight, Bot, LayoutGrid, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Conversation } from "@/hooks/use-conversations";

interface LeadContextPanelProps {
  conversation: Conversation;
  onClose: () => void;
  onAdvanceStatus: (newStatus: string) => void;
  onCreateLead?: () => void;
  onOpenLead?: (leadId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  contacted: "Contactado",
  registered: "Cadastrado",
  visit_scheduled: "Visita Agendada",
  visited: "Visitou",
  proposal_sent: "Proposta Enviada",
  negotiation: "Negociação",
  docs_received: "Docs Recebidos",
  sold: "Vendido",
  inactive: "Inativado",
  info_sent: "Info Enviada",
};

const FUNNEL_STEPS = ["new", "contacted", "registered", "visit_scheduled", "visited", "proposal_sent", "negotiation", "docs_received", "sold"];

export function LeadContextPanel({ conversation, onClose, onAdvanceStatus, onCreateLead, onOpenLead }: LeadContextPanelProps) {
  const navigate = useNavigate();
  const lead = conversation.lead as any;
  if (!lead) {
    return (
      <div className="h-full bg-[#1a1a1e] border-l border-[#2a2a2e] p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Contexto</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-400">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
            <LayoutGrid className="w-6 h-6 text-orange-400" />
          </div>
          <p className="text-sm text-slate-400">Este contato não tem card no Kanban.</p>
          {onCreateLead && (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
              onClick={onCreateLead}
            >
              <LayoutGrid className="w-3 h-3 mr-1" />
              Enviar para Kanban
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentStatus = lead.status || "new";
  const currentIndex = FUNNEL_STEPS.indexOf(currentStatus);
  const nextStep = currentIndex >= 0 && currentIndex < FUNNEL_STEPS.length - 1
    ? FUNNEL_STEPS[currentIndex + 1]
    : null;

  return (
    <div className="h-full bg-[#1a1a1e] border-l border-[#2a2a2e] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#2a2a2e]">
        <h3 className="text-sm font-bold text-white">Contexto do Lead</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenLead ? onOpenLead(lead.id) : navigate(`/corretor/lead/${lead.id}`)}
            className="h-7 w-7 text-slate-400 hover:text-[#FFFF00]"
            title="Ver perfil do lead"
          >
            <UserRoundSearch className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-400">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Lead info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#FFFF00]/20 flex items-center justify-center text-[#FFFF00] font-bold">
              {lead.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{lead.name}</p>
              <Badge variant="outline" className="text-[10px] border-[#2a2a2e] text-slate-400">
                {STATUS_LABELS[currentStatus] || currentStatus}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-400">
            <p className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> {conversation.phone}
            </p>
            {lead.lead_origin && (
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Origem: {lead.lead_origin}
              </p>
            )}
          </div>
        </div>

        {/* Funnel position */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-300">Posição no Funil</p>
          <div className="flex gap-0.5">
            {FUNNEL_STEPS.map((step, i) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= currentIndex ? "bg-[#FFFF00]" : "bg-[#2a2a2e]"
                }`}
              />
            ))}
          </div>
          {nextStep && (
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-[#FFFF00] text-black hover:bg-[#FFFF00]/80 mt-2"
              onClick={() => onAdvanceStatus(nextStep)}
            >
              Avançar para {STATUS_LABELS[nextStep]}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Temperatura: {conversation.temperature}/10</p>
          <div className="h-2 bg-[#2a2a2e] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${conversation.temperature * 10}%`,
                backgroundColor: conversation.temperature >= 7 ? "#f97316"
                  : conversation.temperature >= 4 ? "#eab308"
                  : "#6b7280"
              }}
            />
          </div>
        </div>

        {/* Notes */}
        {lead.notes && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Notas</p>
            <p className="text-xs text-slate-400 bg-[#2a2a2e] rounded p-2">{lead.notes}</p>
          </div>
        )}

        {/* AI Mode info */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-300 flex items-center gap-1">
            <Bot className="w-3 h-3" /> Modo IA
          </p>
          <p className="text-xs text-slate-400">
            {conversation.ai_mode === "ai_active" ? "🟢 Piloto Automático" : "🔵 Modo Copiloto"}
          </p>
          <p className="text-[10px] text-slate-500">
            {conversation.copilot_suggestions_count} sugestões usadas
          </p>
        </div>
      </div>
    </div>
  );
}
