import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead, LeadStatus, STATUS_CONFIG, TIPO_AGENDAMENTO, getOriginDisplayLabel, LEAD_ORIGINS } from "@/types/crm";
import { LeadTimeline } from "@/components/crm/LeadTimeline";
import { AgendamentoModal } from "@/components/crm/AgendamentoModal";
import { ComparecimentoModal } from "@/components/crm/ComparecimentoModal";
import { PropostaModal } from "@/components/crm/PropostaModal";
import { PropostasList } from "@/components/crm/PropostasList";
import { VendaModal } from "@/components/crm/VendaModal";
import { PerdaModal } from "@/components/crm/PerdaModal";
import { FollowUpSheet } from "@/components/crm/FollowUpSheet";
import { CadenciaSheet } from "@/components/crm/CadenciaSheet";
import { TransferLeadDialog } from "@/components/crm/TransferLeadDialog";
import { useKanbanLeads } from "@/hooks/use-kanban-leads";
import { useLeadInteractions } from "@/hooks/use-lead-interactions";
import { usePropostas } from "@/hooks/use-propostas";
import { useUserRole } from "@/hooks/use-user-role";
import { useCadenciaAtiva } from "@/hooks/use-cadencia-ativa";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Phone, Mail, Building2, Clock, Calendar, DollarSign, Trophy,
  UserX, Play, FileText, Users, ChevronRight, ChevronLeft, AlertTriangle, Zap, Eye,
  TrendingUp, Timer, MessageCircle, ExternalLink, ArrowRightLeft, Pencil, Check, X, RotateCw, Square
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FUNNEL_STAGES: { status: LeadStatus; label: string; percent: number }[] = [
  { status: "new", label: "Pré Atend.", percent: 10 },
  { status: "info_sent", label: "Atendimento", percent: 30 },
  { status: "scheduling", label: "Agendamento", percent: 50 },
  { status: "docs_received", label: "Proposta", percent: 75 },
  { status: "registered", label: "Vendido", percent: 100 },
];

interface LeadPageProps {
  embeddedLeadId?: string;
  onBack?: () => void;
}

export default function LeadPage({ embeddedLeadId, onBack }: LeadPageProps = {}) {
  const { leadId: paramLeadId } = useParams<{ leadId: string }>();
  const leadId = embeddedLeadId || paramLeadId;
  const navigate = useNavigate();
  const isEmbedded = !!embeddedLeadId;
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, isLeader } = useUserRole();

  const [agendamentoOpen, setAgendamentoOpen] = useState(false);
  const [agendamentoReagendar, setAgendamentoReagendar] = useState(false);
  const [comparecimentoOpen, setComparecimentoOpen] = useState(false);
  const [propostaOpen, setPropostaOpen] = useState(false);
  const [vendaOpen, setVendaOpen] = useState(false);
  const [perdaOpen, setPerdaOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [cadenciaOpen, setCadenciaOpen] = useState(false);
  const [whatsappMsgOpen, setWhatsappMsgOpen] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [iniciarAtendimentoOpen, setIniciarAtendimentoOpen] = useState(false);
  const [iniciarAtendimentoMsg, setIniciarAtendimentoMsg] = useState("");
  const [iniciarAtendimentoSending, setIniciarAtendimentoSending] = useState(false);

  // Return stage states
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnTargetStage, setReturnTargetStage] = useState<{ status: LeadStatus; label: string; percent: number } | null>(null);
  const [returnProcessing, setReturnProcessing] = useState(false);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { iniciarAtendimento, registrarAgendamento, registrarComparecimento, registrarProposta, registrarNaoComparecimento, reagendarLead, confirmarVenda, inactivateLead, reactivateLead, updateLeadStatus } = useKanbanLeads({ isAdmin: true });
  const { interactions, addInteraction } = useLeadInteractions(leadId || "");
  const { propostas, loading: propostasLoading, criarProposta, aprovarProposta, rejeitarProposta, encaminharVendedor, hasApprovedProposta } = usePropostas(leadId || "");
  const cadencia = useCadenciaAtiva(leadId);

  // Check if lead has a linked conversation for chat navigation
  const { data: linkedConversation } = useQuery({
    queryKey: ["lead-conversation", leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("lead_id", leadId!)
        .maybeSingle();
      return data;
    },
    enabled: !!leadId,
  });

  // Fetch brokers & projects for editable selects
  const { data: allBrokers = [] } = useQuery({
    queryKey: ["all-brokers-leadpage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["all-projects-leadpage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!leadId) return;
    const fetchLead = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select(`*, broker:brokers!leads_broker_id_fkey(id, name, slug), project:projects(id, name, slug, city_slug), attribution:lead_attribution(landing_page, utm_source, utm_medium, utm_campaign, utm_content, utm_term)`)
        .eq("id", leadId)
        .single();
      if (error) {
        toast.error("Lead não encontrado");
        isEmbedded && onBack ? onBack() : navigate(-1);
        return;
      }
      const transformed = {
        ...data,
        attribution: Array.isArray(data.attribution) && data.attribution.length > 0 ? data.attribution[0] : data.attribution
      };
      setLead(transformed as unknown as CRMLead);
      setLoading(false);
    };
    fetchLead();
  }, [leadId, navigate]);

  const refreshLead = async () => {
    if (!leadId) return;
    const { data } = await supabase
      .from("leads")
      .select(`*, broker:brokers!leads_broker_id_fkey(id, name, slug), project:projects(id, name, slug, city_slug), attribution:lead_attribution(landing_page, utm_source, utm_medium, utm_campaign, utm_content, utm_term)`)
      .eq("id", leadId)
      .single();
    if (data) {
      const transformed = { ...data, attribution: Array.isArray(data.attribution) && data.attribution.length > 0 ? data.attribution[0] : data.attribution };
      setLead(transformed as unknown as CRMLead);
    }
  };

  // ─── Inline edit helpers ───
  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: currentValue });
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const saveField = async (field: string, value: string) => {
    if (!lead || !leadId) return;
    const oldValue = getFieldCurrentValue(field);
    if (value === oldValue) { cancelEdit(); return; }

    try {
      // Special case: broker transfer
      if (field === "broker_id") {
        const { error } = await supabase.rpc("transfer_lead", { _lead_id: leadId, _new_broker_id: value });
        if (error) throw error;
        // Notify (non-blocking)
        supabase.functions.invoke("notify-transfer", { body: { lead_id: leadId, new_broker_id: value } }).catch(() => {});
        const targetBroker = allBrokers.find(b => b.id === value);
        toast.success(`Lead transferido para ${targetBroker?.name || "corretor"}`);
      } else {
        const updatePayload: Record<string, string | null> = {};
        if (field === "project_id") {
          updatePayload.project_id = value || null;
        } else {
          updatePayload[field] = value;
        }
        const { error } = await supabase.from("leads").update(updatePayload).eq("id", leadId);
        if (error) throw error;

        // Log the change
        const fieldLabels: Record<string, string> = { name: "Nome", whatsapp: "Telefone", email: "Email", project_id: "Empreendimento", lead_origin: "Origem", notes: "Observações" };
        const label = fieldLabels[field] || field;
        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          interaction_type: "note_added" as any,
          notes: `${label} alterado para: ${value || "(vazio)"}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

        toast.success("Dados atualizados");
      }

      await refreshLead();
      setEditingField(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const getFieldCurrentValue = (field: string): string => {
    if (!lead) return "";
    switch (field) {
      case "name": return lead.name;
      case "whatsapp": return lead.whatsapp;
      case "email": return lead.email || "";
      case "project_id": return lead.project?.id || "";
      case "lead_origin": return lead.lead_origin || "";
      case "broker_id": return lead.broker?.id || "";
      case "notes": return lead.notes || "";
      default: return "";
    }
  };

  // Computed metrics
  const tempoNoFunil = useMemo(() => {
    if (!lead) return "";
    const diff = Date.now() - new Date(lead.created_at).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days === 0) return `${hours}h`;
    return `${days}d ${hours}h`;
  }, [lead]);

  const tempoNaEtapa = useMemo(() => {
    if (!lead) return "";
    const diff = Date.now() - new Date(lead.updated_at).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days === 0) return `${hours}h`;
    return `${days}d ${hours}h`;
  }, [lead]);

  const slaPrimeiroAtendimento = useMemo(() => {
    if (!lead) return null;
    if (!lead.atendimento_iniciado_em) return null;
    const diff = new Date(lead.atendimento_iniciado_em).getTime() - new Date(lead.created_at).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }, [lead]);

  const slaColor = useMemo(() => {
    if (!lead) return "text-slate-500";
    if (lead.status === "registered") return "text-emerald-400";
    const lastInteraction = lead.last_interaction_at || lead.updated_at;
    const diff = Date.now() - new Date(lastInteraction).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return "text-emerald-400";
    if (hours < 48) return "text-yellow-400";
    return "text-red-400";
  }, [lead]);

  const slaLabel = useMemo(() => {
    if (!lead) return "";
    if (lead.status === "registered") return "Concluído";
    const lastInteraction = lead.last_interaction_at || lead.updated_at;
    const diff = Date.now() - new Date(lastInteraction).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return "No prazo";
    if (hours < 48) return "Atenção";
    return "SLA estourado";
  }, [lead]);

  const currentStageIndex = useMemo(() => {
    if (!lead) return 0;
    const idx = FUNNEL_STAGES.findIndex(s => s.status === lead.status);
    return idx >= 0 ? idx : 0;
  }, [lead]);

  const primaryAction = useMemo(() => {
    if (!lead) return null;
    switch (lead.status) {
      case "new": return { label: "Iniciar Atendimento", icon: Play, color: "bg-emerald-500 hover:bg-emerald-600", action: "iniciar" };
      case "info_sent": return { label: "Agendar Reunião", icon: Calendar, color: "bg-yellow-500 hover:bg-yellow-600 text-black", action: "agendar" };
      case "scheduling":
        if (lead.comparecimento === true) {
          return { label: "Inserir Proposta", icon: DollarSign, color: "bg-purple-500 hover:bg-purple-600", action: "proposta" };
        }
        if (lead.comparecimento === false) {
          return { label: "Reagendar", icon: RotateCw, color: "bg-amber-500 hover:bg-amber-600 text-black", action: "reagendar" };
        }
        return { label: "Registrar Comparecimento", icon: Eye, color: "bg-blue-500 hover:bg-blue-600", action: "comparecimento" };
      case "docs_received":
        if (hasApprovedProposta) {
          return { label: "Confirmar Venda", icon: Trophy, color: "bg-emerald-500 hover:bg-emerald-600", action: "venda" };
        }
        return { label: "Nova Proposta", icon: DollarSign, color: "bg-yellow-500 hover:bg-yellow-600 text-black", action: "proposta" };
      default: return null;
    }
  }, [lead]);

  if (loading || !lead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f12]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Carregando lead...</span>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[lead.status];
  const tipoAgLabel = TIPO_AGENDAMENTO.find(t => t.key === lead.tipo_agendamento)?.label || lead.tipo_agendamento;
  const isLost = lead.status === "inactive";
  const isSold = lead.status === "registered";
  const canTransfer = role === "admin" || isLeader;

  const handlePrimaryAction = async () => {
    if (!primaryAction) return;
    switch (primaryAction.action) {
      case "iniciar": {
        // Go directly to WhatsApp
        const result = await iniciarAtendimento(lead.id);
        if (result.success) {
          addInteraction("whatsapp_manual" as any, {
            notes: "Atendimento iniciado — redirecionado para WhatsApp",
            channel: "whatsapp",
            createdBy: result.userId,
          });
          const cleanPhone = lead.whatsapp.replace(/\D/g, "");
          toast.success("Atendimento iniciado!");
          refreshLead();
          window.open(`https://wa.me/55${cleanPhone}`, "_blank");
        }
        break;
      }
      case "agendar": setAgendamentoOpen(true); break;
      case "comparecimento": setComparecimentoOpen(true); break;
      case "proposta": setPropostaOpen(true); break;
      case "venda": setVendaOpen(true); break;
      case "reagendar": setAgendamentoReagendar(true); break;
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnTargetStage || !lead || !leadId) return;
    setReturnProcessing(true);
    try {
      const oldStatus = lead.status;
      const newStatus = returnTargetStage.status;

      // Update status only - preserve all lead data
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await updateLeadStatus(leadId, oldStatus, newStatus, userId);
      await refreshLead();
      toast.success(`Lead retornado para ${returnTargetStage.label}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao retornar etapa");
    } finally {
      setReturnProcessing(false);
      setReturnDialogOpen(false);
      setReturnTargetStage(null);
    }
  };

  const whatsappLink = `https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`;

  return (
    <div className={cn(isEmbedded ? "h-full overflow-auto" : "min-h-screen", "bg-[#0a0a0d] text-white")}>
      {/* ━━━━━━━━━━━━━━ STRATEGIC HEADER ━━━━━━━━━━━━━━ */}
      <div className="sticky top-0 z-30 bg-[#0f0f12]/95 backdrop-blur-xl border-b border-[#1e1e22] pt-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <button onClick={() => isEmbedded && onBack ? onBack() : navigate(-1)} className="p-2 rounded-lg hover:bg-[#1e1e22] transition-all group">
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-lg sm:text-xl font-semibold truncate">{lead.name}</h1>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase",
                  isSold && "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
                  isLost && "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
                  !isSold && !isLost && "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20"
                )}>
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 mt-1 text-[10px] sm:text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{tempoNoFunil} no funil</span>
                <span className={cn("flex items-center gap-1 font-medium", slaColor)}><Zap className="w-3 h-3" />{slaLabel}</span>
                {lead.project?.name && <span className="hidden sm:flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.project.name}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Chat buttons - temporarily disabled */}
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all">
                <MessageCircle className="w-3.5 h-3.5" />WhatsApp<ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Funnel progress bar - interactive */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1">
              {FUNNEL_STAGES.map((stage, i) => {
                const isActive = i <= currentStageIndex;
                const isCurrent = i === currentStageIndex;
                const isPrevious = i < currentStageIndex && !isLost && !isSold;
                const isNext = i === currentStageIndex + 1 && !isLost && !isSold;
                const isFuture = i > currentStageIndex + 1;

                const tooltipText = isCurrent
                  ? "Etapa atual"
                  : isPrevious
                    ? `Clique para retornar a ${stage.label}`
                    : isNext
                      ? (() => {
                          switch (stage.status) {
                            case "info_sent": return "Clique para Iniciar Atendimento";
                            case "scheduling": return "Clique para Agendar";
                            case "docs_received":
                              return lead.comparecimento === true ? "Clique para Inserir Proposta" : lead.comparecimento === false ? "Clique para Reagendar" : "Clique para Registrar Comparecimento";
                            case "registered":
                              return hasApprovedProposta ? "Clique para Confirmar Venda" : "Aprove uma proposta antes";
                            default: return "";
                          }
                        })()
                      : "Complete a etapa anterior";

                const handleStageClick = () => {
                  if (isPrevious) {
                    setReturnTargetStage(stage);
                    setReturnDialogOpen(true);
                    return;
                  }
                  if (!isNext) return;
                  switch (stage.status) {
                    case "info_sent": handlePrimaryAction(); break;
                    case "scheduling": setAgendamentoOpen(true); break;
                    case "docs_received":
                      if (lead.comparecimento === true) setPropostaOpen(true);
                      else if (lead.comparecimento === false) setAgendamentoReagendar(true);
                      else setComparecimentoOpen(true);
                      break;
                    case "registered":
                      if (hasApprovedProposta) setVendaOpen(true);
                      else toast.info("Aprove uma proposta antes de confirmar a venda");
                      break;
                  }
                };

                return (
                  <Tooltip key={stage.status}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleStageClick}
                        className={cn(
                          "flex-1 relative group focus:outline-none",
                          (isNext || isPrevious) && "cursor-pointer",
                          isFuture && "cursor-not-allowed",
                          !isNext && !isFuture && !isPrevious && "cursor-default"
                        )}
                      >
                        <div className={cn(
                          "h-1.5 rounded-full transition-all duration-500",
                          isActive
                            ? isCurrent
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                              : isPrevious
                                ? "bg-yellow-500/60 group-hover:bg-yellow-500/80"
                                : "bg-yellow-500/60"
                            : isNext
                              ? "bg-yellow-500/25 ring-1 ring-yellow-400/50 animate-pulse"
                              : "bg-[#1e1e22]"
                        )} />
                        <span className={cn(
                          "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium whitespace-nowrap transition-colors flex items-center gap-0.5",
                          isCurrent ? "text-yellow-400" : isPrevious ? "text-slate-500 group-hover:text-yellow-500/70" : isActive ? "text-slate-500" : isNext ? "text-yellow-500/70" : "text-slate-600"
                        )}>
                          {isPrevious && <ChevronLeft className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          {isNext && <ChevronRight className="w-2.5 h-2.5" />}
                          {stage.label}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {tooltipText}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

        </div>
      </div>

      {/* ━━━━━━━━━━━━━━ MAIN CONTENT ━━━━━━━━━━━━━━ */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-8 sm:pt-10 pb-10">
        {slaLabel === "SLA estourado" && (
          <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300">Este lead está sem interação há mais de 48h. Ação imediata é necessária.</p>
          </div>
        )}

        {/* Cadência ativa indicator */}
        {cadencia.isActive && (
          <div className="flex items-center gap-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-emerald-300 flex-1">
              Cadência ativa
              {cadencia.nextMessageAt && (
                <span className="text-slate-400">
                  {" — próxima mensagem em "}
                  {(() => {
                    const diff = new Date(cadencia.nextMessageAt).getTime() - Date.now();
                    if (diff < 0) return "breve";
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    if (hours > 24) return `${Math.floor(hours / 24)}d`;
                    if (hours > 0) return `${hours}h ${mins}min`;
                    return `${mins}min`;
                  })()}
                </span>
              )}
            </p>
            <button
              onClick={() => cadencia.cancel()}
              className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="Parar cadência"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action buttons */}
        {!isSold && !isLost && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 sm:flex-wrap">
            {primaryAction && (
              <Button onClick={handlePrimaryAction} className={cn("w-full sm:w-auto h-11 sm:h-9 px-4 text-sm sm:text-xs font-semibold rounded-lg shadow-lg transition-all", primaryAction.color)}>
                <primaryAction.icon className="w-3.5 h-3.5 mr-1.5" />{primaryAction.label}
              </Button>
            )}
            {lead.status === "scheduling" && (
              <Button variant="outline" size="sm" onClick={() => setAgendamentoReagendar(true)} className="w-full sm:w-auto h-11 sm:h-9 text-sm sm:text-xs border-[#2a2a2e] text-slate-300 hover:bg-[#1e1e22]">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />Reagendar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)} className="w-full sm:w-auto h-11 sm:h-9 text-sm sm:text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Follow-Up
            </Button>
            {!cadencia.isActive && (
              <Button variant="outline" size="sm" onClick={() => setCadenciaOpen(true)} className="w-full sm:w-auto h-11 sm:h-9 text-sm sm:text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
                <Zap className="w-3.5 h-3.5 mr-1.5" />Cadência 10D
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setPerdaOpen(true)} className="w-full sm:w-auto h-11 sm:h-9 text-sm sm:text-xs border-[#2a2a2e] text-red-400/80 hover:bg-red-500/10 hover:border-red-500/20">
              <UserX className="w-3.5 h-3.5 mr-1.5" />Inativar
            </Button>
            {canTransfer && (
              <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)} className="w-full sm:w-auto h-11 sm:h-9 text-sm sm:text-xs border-[#2a2a2e] text-slate-400 hover:bg-[#1e1e22]">
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />Transferir
              </Button>
            )}
          </div>
        )}

        {/* Iniciar Atendimento - removed, now opens WhatsApp directly */}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ━━━━ LEFT COLUMN (60%) ━━━━ */}
          <div className="lg:col-span-3 space-y-6">

            {/* Propostas Section - only visible in Proposta/Vendido stages, or inactive with existing propostas */}
            {(lead.status === "docs_received" || lead.status === "registered" || 
              (lead.status === "inactive" && propostas.length > 0)) && (
              <PropostasList
                propostas={propostas}
                loading={propostasLoading}
                onNovaProposta={() => setPropostaOpen(true)}
                onAprovar={aprovarProposta}
                onRejeitar={rejeitarProposta}
                onEncaminhar={encaminharVendedor}
                leadName={lead.name}
                leadWhatsapp={lead.whatsapp}
                leadEmail={lead.email}
                leadCpf={lead.cpf || null}
                brokerName={lead.broker?.name || null}
                projectName={lead.project?.name || null}
              />
            )}

            {/* Lead Data - Editable */}
            <section className="bg-[#111114] rounded-2xl border border-[#1e1e22] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e1e22]">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dados do Lead</h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditableField
                  icon={Phone}
                  label="Telefone"
                  field="whatsapp"
                  value={lead.whatsapp}
                  editingField={editingField}
                  editValues={editValues}
                  onStartEdit={startEdit}
                  onCancel={cancelEdit}
                  onSave={saveField}
                  onEditValueChange={(v) => setEditValues({ ...editValues, whatsapp: v })}
                  action={
                    <Button
                      size="sm"
                      onClick={() => setWhatsappMsgOpen(!whatsappMsgOpen)}
                      className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md shadow-emerald-900/30 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Enviar WhatsApp
                    </Button>
                  }
                />
                {whatsappMsgOpen && (
                  <div className="sm:col-span-2 bg-[#0f0f12] border border-emerald-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-medium text-emerald-400">Mensagem para {lead.name}</p>
                    <Textarea
                      autoFocus
                      placeholder="Escreva sua mensagem aqui..."
                      value={whatsappMsg}
                      onChange={(e) => setWhatsappMsg(e.target.value)}
                      className="min-h-[80px] bg-[#111114] border-[#2a2a2e] text-sm text-slate-200 placeholder:text-slate-600 resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={!whatsappMsg.trim() || sendingWhatsapp}
                        onClick={async () => {
                          setSendingWhatsapp(true);
                          try {
                            await addInteraction("whatsapp_manual" as any, {
                              notes: whatsappMsg,
                              channel: "whatsapp",
                              createdBy: (await supabase.auth.getUser()).data.user?.id,
                            });
                            const cleanPhone = lead.whatsapp.replace(/\D/g, "");
                            window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`, "_blank");
                            setWhatsappMsg("");
                            setWhatsappMsgOpen(false);
                            toast.success("Interação registrada!");
                          } catch {
                            toast.error("Erro ao registrar interação");
                          } finally {
                            setSendingWhatsapp(false);
                          }
                        }}
                        className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        {sendingWhatsapp ? "Enviando..." : "Enviar via WhatsApp"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setWhatsappMsgOpen(false); setWhatsappMsg(""); }}
                        className="h-9 text-xs text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <EditableField icon={Mail} label="E-mail" field="email" value={lead.email || "—"}
                  editingField={editingField} editValues={editValues} onStartEdit={startEdit} onCancel={cancelEdit} onSave={saveField}
                  onEditValueChange={(v) => setEditValues({ ...editValues, email: v })} />


                <EditableSelectField
                  icon={Building2}
                  label="Origem"
                  field="lead_origin"
                  displayValue={lead.lead_origin ? getOriginDisplayLabel(lead.lead_origin) : "—"}
                  currentValue={lead.lead_origin || ""}
                  options={LEAD_ORIGINS.map(o => ({ value: o.key, label: o.label }))}
                  editingField={editingField}
                  onStartEdit={() => setEditingField("lead_origin")}
                  onCancel={cancelEdit}
                  onSave={saveField}
                />

                <EditableSelectField
                  icon={Building2}
                  label="Empreendimento"
                  field="project_id"
                  displayValue={lead.project?.name || "—"}
                  currentValue={lead.project_id || ""}
                  options={allProjects.map((p: any) => ({ value: p.id, label: p.name }))}
                  editingField={editingField}
                  onStartEdit={() => setEditingField("project_id")}
                  onCancel={cancelEdit}
                  onSave={saveField}
                />

                <EditableSelectField
                  icon={Users}
                  label="Corretor"
                  field="broker_id"
                  displayValue={lead.broker?.name || "—"}
                  currentValue={lead.broker_id || ""}
                  options={allBrokers.map((b: any) => ({ value: b.id, label: b.name }))}
                  editingField={editingField}
                  onStartEdit={() => setEditingField("broker_id")}
                  onCancel={cancelEdit}
                  onSave={saveField}
                />

                <DataField icon={Calendar} label="Entrada" value={new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} />

                {/* Editable Name - full width */}
                <div className="sm:col-span-2">
                  <EditableField icon={FileText} label="Nome" field="name" value={lead.name}
                    editingField={editingField} editValues={editValues} onStartEdit={startEdit} onCancel={cancelEdit} onSave={saveField}
                    onEditValueChange={(v) => setEditValues({ ...editValues, name: v })} />
                </div>
              </div>
            </section>

            {/* Commercial Progress */}
            <section className="bg-[#111114] rounded-2xl border border-[#1e1e22] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e1e22]">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Progresso Comercial</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <CommercialCard label="Agendamento" value={lead.data_agendamento ? new Date(lead.data_agendamento).toLocaleDateString("pt-BR") : null} sub={tipoAgLabel || undefined} icon={Calendar} />
                  <CommercialCard label="Comparecimento" value={lead.comparecimento === true ? "Compareceu" : lead.comparecimento === false ? "Não compareceu" : null} icon={Eye} variant={lead.comparecimento === true ? "success" : lead.comparecimento === false ? "danger" : "default"} />
                  <CommercialCard label="Valor Proposta" value={lead.valor_proposta ? formatCurrency(lead.valor_proposta) : null} icon={FileText} highlight />
                  <CommercialCard label="Valor Venda" value={lead.valor_final_venda ? formatCurrency(lead.valor_final_venda) : null} icon={DollarSign} highlight variant={lead.valor_final_venda ? "success" : "default"} />
                  <CommercialCard label="Fechamento" value={lead.data_fechamento ? new Date(lead.data_fechamento).toLocaleDateString("pt-BR") : null} icon={Trophy} variant={lead.data_fechamento ? "success" : "default"} />
                  {lead.data_perda && (
                    <CommercialCard label="Perda" value={new Date(lead.data_perda).toLocaleDateString("pt-BR")} sub={lead.etapa_perda ? STATUS_CONFIG[lead.etapa_perda as LeadStatus]?.label : undefined} icon={UserX} variant="danger" />
                  )}
                </div>
              </div>
            </section>

            {/* Metrics */}
            <section className="bg-[#111114] rounded-2xl border border-[#1e1e22] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e1e22]">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Métricas</h2>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricCard label="1º Atendimento" value={slaPrimeiroAtendimento || (lead.status === "new" ? "Aguardando" : "—")} color={slaPrimeiroAtendimento ? "text-emerald-400" : "text-slate-500"} />
                <MetricCard label="Na etapa atual" value={tempoNaEtapa} color="text-slate-300" />
                <MetricCard label="No funil" value={tempoNoFunil} color="text-slate-300" />
                <MetricCard label="Interações" value={String(interactions.length)} color="text-yellow-400" />
              </div>
            </section>

            {/* Notes */}
            {lead.notes && (
              <section className="bg-[#111114] rounded-2xl border border-[#1e1e22] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Observações</h2>
                <p className="text-sm text-slate-300 leading-relaxed">{lead.notes}</p>
              </section>
            )}
          </div>

          {/* ━━━━ RIGHT COLUMN (40%) ━━━━ */}
          <div className="lg:col-span-2 space-y-6">

            {/* Sold state */}
            {isSold && (
              <section className="bg-emerald-500/5 rounded-2xl border border-emerald-500/20 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3"><Trophy className="w-6 h-6 text-emerald-400" /></div>
                <h3 className="text-base font-semibold text-emerald-400 mb-1">Venda Concluída</h3>
                {lead.valor_final_venda && <p className="text-2xl font-bold text-white">{formatCurrency(lead.valor_final_venda)}</p>}
                {lead.data_fechamento && <p className="text-xs text-slate-500 mt-2">{new Date(lead.data_fechamento).toLocaleDateString("pt-BR")}</p>}
              </section>
            )}

            {/* Lost state */}
            {isLost && (
              <section className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-3"><UserX className="w-6 h-6 text-red-400" /></div>
                <h3 className="text-base font-semibold text-red-400 mb-1">Lead Perdido</h3>
                {lead.inactivation_reason && <p className="text-sm text-slate-400 mt-1">{lead.inactivation_reason}</p>}
                <Button
                  onClick={async () => {
                    const ok = await reactivateLead(lead.id);
                    if (ok) refreshLead();
                  }}
                  className="mt-4 h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  <RotateCw className="w-3.5 h-3.5 mr-1.5" />Reativar Lead
                </Button>
              </section>
            )}

            {/* Timeline */}
            <section className="bg-[#111114] rounded-2xl border border-[#1e1e22] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e1e22]">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Linha do Tempo</h2>
              </div>
              <div className="p-5 max-h-[600px] overflow-y-auto scrollbar-subtle">
                <LeadTimeline
                  interactions={interactions}
                  leadOrigin={lead?.lead_origin}
                  leadOriginDetail={lead?.lead_origin_detail}
                  attribution={lead?.attribution}
                  createdAt={lead?.created_at}
                  brokerName={lead?.broker?.name}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━ MODALS ━━━━━━━━━━━━━━ */}
      <AgendamentoModal
        open={agendamentoOpen || agendamentoReagendar}
        onOpenChange={(v) => { setAgendamentoOpen(v); setAgendamentoReagendar(v); }}
        title={agendamentoReagendar ? "Reagendar" : "Registrar Agendamento"}
        onConfirm={async (data, tipo) => {
          if (agendamentoReagendar) {
            const ok = await reagendarLead(lead.id, data, tipo);
            if (ok) { toast.success("Reagendado!"); refreshLead(); }
          } else {
            const ok = await registrarAgendamento(lead.id, data, tipo);
            if (ok) { toast.success("Agendamento registrado!"); refreshLead(); }
          }
        }}
      />
      <ComparecimentoModal
        open={comparecimentoOpen}
        onOpenChange={setComparecimentoOpen}
        onCompareceu={async () => {
          const ok = await registrarComparecimento(lead.id);
          if (ok) { toast.success("Comparecimento registrado!"); refreshLead(); }
        }}
        onNaoCompareceu={() => { registrarNaoComparecimento(lead.id); setAgendamentoReagendar(true); }}
      />
      <PropostaModal
        open={propostaOpen}
        onOpenChange={setPropostaOpen}
        onConfirm={async (data) => {
          const ok = await criarProposta({ ...data, lead_id: lead.id, project_id: data.project_id || lead.project?.id || null, broker_id: lead.broker?.id || null });
          if (ok) { refreshLead(); }
          return !!ok;
        }}
        leadProjectId={lead.project?.id}
        leadProjectName={lead.project?.name}
        leadBrokerId={lead.broker?.id}
        projects={allProjects}
      />
      <VendaModal
        open={vendaOpen}
        onOpenChange={setVendaOpen}
        onConfirm={async (valor, data) => {
          const ok = await confirmarVenda(lead.id, valor, data);
          if (ok) { toast.success("Venda confirmada! 🎉"); refreshLead(); }
        }}
      />
      <PerdaModal
        open={perdaOpen}
        onOpenChange={setPerdaOpen}
        onConfirm={async (reason) => {
          const ok = await inactivateLead(lead.id, reason, lead.status);
          if (ok) { toast.success("Lead inativado com sucesso."); refreshLead(); }
        }}
      />
      <FollowUpSheet
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        leadId={lead.id}
        leadName={lead.name}
        leadPhone={lead.whatsapp}
        projectName={lead.project?.name}
        brokerName={lead.broker?.name}
        brokerId={lead.broker?.id || ""}
        onCreated={refreshLead}
      />
      <CadenciaSheet
        open={cadenciaOpen}
        onOpenChange={setCadenciaOpen}
        leadId={lead.id}
        leadName={lead.name}
        leadPhone={lead.whatsapp}
        projectName={lead.project?.name}
        brokerName={lead.broker?.name}
        brokerId={lead.broker?.id || ""}
        leadStatus={lead.status}
        onCreated={refreshLead}
      />
      <TransferLeadDialog
        leadId={lead.id}
        leadName={lead.name}
        currentBrokerId={lead.broker?.id}
        brokers={allBrokers}
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        onTransferred={refreshLead}
      />

      {/* Return stage confirmation dialog */}
      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent className="bg-[#1e1e22] border-[#2a2a2e] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-yellow-400" />
              Retornar etapa
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Deseja retornar o lead para a etapa <strong className="text-white">{returnTargetStage?.label}</strong>? 
              O lead será movido de volta no funil e os dados das etapas posteriores serão limpos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e] hover:text-white" disabled={returnProcessing}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReturn}
              disabled={returnProcessing}
              className="bg-yellow-500 text-black hover:bg-yellow-600"
            >
              {returnProcessing ? "Retornando..." : "Confirmar retorno"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ━━━━━━━━━━━━━━ SUB-COMPONENTS ━━━━━━━━━━━━━━

function DataField({ icon: Icon, label, value, placeholder }: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  placeholder?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-0.5">{label}</p>
        <p className={cn("text-sm truncate", value ? "text-slate-200" : "text-slate-600 italic")}>
          {value || placeholder || "—"}
        </p>
      </div>
    </div>
  );
}

function EditableField({ icon: Icon, label, field, value, placeholder, action, highlight, editingField, editValues, onStartEdit, onCancel, onSave, onEditValueChange }: {
  icon: React.ElementType;
  label: string;
  field: string;
  value: string;
  placeholder?: string;
  action?: React.ReactNode;
  highlight?: boolean;
  editingField: string | null;
  editValues: Record<string, string>;
  onStartEdit: (field: string, currentValue: string) => void;
  onCancel: () => void;
  onSave: (field: string, value: string) => void;
  onEditValueChange: (value: string) => void;
}) {
  const isEditing = editingField === field;

  if (isEditing) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">{label}</p>
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={editValues[field] ?? value}
              onChange={(e) => onEditValueChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSave(field, editValues[field] ?? value); if (e.key === "Escape") onCancel(); }}
              className="h-8 text-sm bg-[#0f0f12] border-[#2a2a2e] text-white"
            />
            <button onClick={() => onSave(field, editValues[field] ?? value)} className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-400 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-red-500/10 text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <p className={cn("text-sm truncate", value ? (highlight ? "text-yellow-400 font-medium" : "text-slate-400") : "text-slate-600 italic")}>
            {value || placeholder || "—"}
          </p>
          <button onClick={() => onStartEdit(field, value)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#1e1e22] transition-all">
            <Pencil className="w-3 h-3 text-slate-500" />
          </button>
        </div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}

function EditableSelectField({ icon: Icon, label, field, displayValue, currentValue, options, editingField, onStartEdit, onCancel, onSave, highlight }: {
  icon: React.ElementType;
  label: string;
  field: string;
  displayValue: string;
  currentValue: string;
  options: { value: string; label: string }[];
  editingField: string | null;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (field: string, value: string) => void;
  highlight?: boolean;
}) {
  const isEditing = editingField === field;

  if (isEditing) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">{label}</p>
          <div className="flex items-center gap-1.5">
            <Select defaultValue={currentValue} onValueChange={(v) => onSave(field, v)}>
              <SelectTrigger className="h-8 text-sm bg-[#0f0f12] border-[#2a2a2e] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                {options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-slate-200 focus:bg-[#2a2a2e] focus:text-white">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-red-500/10 text-red-400 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      <div className="w-8 h-8 rounded-lg bg-[#1a1a1e] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <p className={cn("text-sm truncate", displayValue ? (highlight ? "text-yellow-400 font-medium" : "text-slate-200") : "text-slate-600 italic")}>
            {displayValue || "—"}
          </p>
          <button onClick={onStartEdit} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#1e1e22] transition-all">
            <Pencil className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommercialCard({ label, value, sub, icon: Icon, highlight, variant = "default" }: {
  label: string;
  value: string | null;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
  variant?: "default" | "success" | "danger";
}) {
  const variantStyles = { default: "border-[#1e1e22]", success: "border-emerald-500/20 bg-emerald-500/5", danger: "border-red-500/20 bg-red-500/5" };
  return (
    <div className={cn("rounded-xl border p-3.5 bg-[#0f0f12] transition-colors", variantStyles[variant])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-3.5 h-3.5", variant === "success" ? "text-emerald-400" : variant === "danger" ? "text-red-400" : "text-slate-500")} />
        <span className="text-[10px] uppercase tracking-wider text-slate-600">{label}</span>
      </div>
      <p className={cn("text-sm font-medium", !value && "text-slate-600 italic text-xs", value && highlight && "text-yellow-400", value && variant === "success" && "text-emerald-400", value && variant === "danger" && "text-red-400", value && variant === "default" && !highlight && "text-slate-200")}>
        {value || "—"}
      </p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-lg font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}
