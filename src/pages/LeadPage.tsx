import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead, LeadStatus, STATUS_CONFIG, TIPO_AGENDAMENTO, getOriginDisplayLabel, getInactivationReasonLabel } from "@/types/crm";
import { LeadTimeline } from "@/components/crm/LeadTimeline";
import { AgendamentoModal } from "@/components/crm/AgendamentoModal";
import { ComparecimentoModal } from "@/components/crm/ComparecimentoModal";
import { VendaModal } from "@/components/crm/VendaModal";
import { PerdaModal } from "@/components/crm/PerdaModal";
import { useKanbanLeads } from "@/hooks/use-kanban-leads";
import { useLeadInteractions } from "@/hooks/use-lead-interactions";
import { ArrowLeft, Phone, Mail, Building2, MapPin, Clock, Calendar, DollarSign, Trophy, UserX, Play, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LeadPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [agendamentoOpen, setAgendamentoOpen] = useState(false);
  const [agendamentoReagendar, setAgendamentoReagendar] = useState(false);
  const [comparecimentoOpen, setComparecimentoOpen] = useState(false);
  const [vendaOpen, setVendaOpen] = useState(false);
  const [perdaOpen, setPerdaOpen] = useState(false);

  const { iniciarAtendimento, registrarAgendamento, registrarComparecimentoEProposta, registrarNaoComparecimento, reagendarLead, confirmarVenda, inactivateLead } = useKanbanLeads({ isAdmin: true });
  const { interactions } = useLeadInteractions(leadId || "");

  useEffect(() => {
    if (!leadId) return;
    const fetchLead = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select(`*, broker:brokers!leads_broker_id_fkey(id, name, slug), project:projects(id, name, slug, city_slug), attribution:lead_attribution(landing_page, utm_source, utm_medium, utm_campaign)`)
        .eq("id", leadId)
        .single();
      if (error) {
        toast.error("Lead não encontrado");
        navigate(-1);
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
      .select(`*, broker:brokers!leads_broker_id_fkey(id, name, slug), project:projects(id, name, slug, city_slug), attribution:lead_attribution(landing_page, utm_source, utm_medium, utm_campaign)`)
      .eq("id", leadId)
      .single();
    if (data) {
      const transformed = { ...data, attribution: Array.isArray(data.attribution) && data.attribution.length > 0 ? data.attribution[0] : data.attribution };
      setLead(transformed as unknown as CRMLead);
    }
  };

  const tempoNoFunil = useMemo(() => {
    if (!lead) return "";
    const diff = Date.now() - new Date(lead.created_at).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days === 0) return `${hours}h`;
    return `${days}d ${hours}h`;
  }, [lead]);

  const sla = useMemo(() => {
    if (!lead) return null;
    if (!lead.atendimento_iniciado_em) return "Aguardando";
    const diff = new Date(lead.atendimento_iniciado_em).getTime() - new Date(lead.created_at).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }, [lead]);

  if (loading || !lead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f12]">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[lead.status];
  const tipoAgLabel = TIPO_AGENDAMENTO.find(t => t.key === lead.tipo_agendamento)?.label || lead.tipo_agendamento;

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#1e1e22] transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{lead.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}>{statusConfig.label}</Badge>
              <span className="text-xs text-slate-500">Tempo no funil: {tempoNoFunil}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section 1 - Dados Principais */}
          <div className="bg-[#1e1e22] rounded-xl p-4 border border-[#2a2a2e]">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Dados Principais</h3>
            <div className="space-y-2.5">
              <InfoRow icon={Phone} label="Telefone" value={lead.whatsapp} />
              <InfoRow icon={Mail} label="Email" value={lead.email || "—"} />
              <InfoRow icon={Building2} label="Empreendimento" value={lead.project?.name || "—"} />
              <InfoRow icon={MapPin} label="Origem" value={getOriginDisplayLabel(lead.lead_origin)} />
              <InfoRow icon={Users} label="Corretor" value={lead.broker?.name || "Enove"} />
              <InfoRow icon={Clock} label="Cadastro" value={new Date(lead.created_at).toLocaleString("pt-BR")} />
              {lead.attribution?.landing_page && (
                <InfoRow icon={MapPin} label="Tipo" value={lead.attribution.landing_page === "admin_manual" ? "Manual" : "Automático"} />
              )}
              {sla && <InfoRow icon={Clock} label="SLA (1º atendimento)" value={sla} />}
            </div>
          </div>

          {/* Section 3 - Ações Disponíveis */}
          <div className="bg-[#1e1e22] rounded-xl p-4 border border-[#2a2a2e]">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Ações Disponíveis</h3>
            <div className="space-y-2">
              {lead.status === "new" && (
                <Button onClick={async () => { const ok = await iniciarAtendimento(lead.id); if (ok) { toast.success("Atendimento iniciado!"); refreshLead(); } }} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Play className="w-4 h-4 mr-2" />Iniciar Atendimento
                </Button>
              )}
              {lead.status === "info_sent" && (
                <Button onClick={() => setAgendamentoOpen(true)} className="w-full bg-orange-600 hover:bg-orange-700">
                  <Calendar className="w-4 h-4 mr-2" />Registrar Agendamento
                </Button>
              )}
              {lead.status === "scheduling" && (
                <Button onClick={() => setComparecimentoOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                  <FileText className="w-4 h-4 mr-2" />Registrar Comparecimento
                </Button>
              )}
              {lead.status === "docs_received" && (
                <Button onClick={() => setVendaOpen(true)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Trophy className="w-4 h-4 mr-2" />Confirmar Venda
                </Button>
              )}
              {lead.status !== "registered" && lead.status !== "inactive" && (
                <Button variant="outline" onClick={() => setPerdaOpen(true)} className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <UserX className="w-4 h-4 mr-2" />Registrar Perda
                </Button>
              )}
              {lead.status === "registered" && (
                <p className="text-sm text-emerald-400 text-center py-4">🎉 Venda concluída!</p>
              )}
            </div>
          </div>

          {/* Section 4 - Informações Comerciais */}
          <div className="bg-[#1e1e22] rounded-xl p-4 border border-[#2a2a2e]">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Informações Comerciais</h3>
            <div className="space-y-2.5">
              <CommRow label="Agendamento" value={lead.data_agendamento ? new Date(lead.data_agendamento).toLocaleDateString("pt-BR") : null} />
              <CommRow label="Tipo" value={tipoAgLabel} />
              <CommRow label="Comparecimento" value={lead.comparecimento === true ? "✅ Sim" : lead.comparecimento === false ? "❌ Não" : null} />
              <CommRow label="Valor Proposta" value={lead.valor_proposta ? `R$ ${lead.valor_proposta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
              <CommRow label="Valor Venda" value={lead.valor_final_venda ? `R$ ${lead.valor_final_venda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
              <CommRow label="Fechamento" value={lead.data_fechamento ? new Date(lead.data_fechamento).toLocaleDateString("pt-BR") : null} />
              {lead.notes && <CommRow label="Observações" value={lead.notes} />}
            </div>
          </div>

          {/* Section 5 - Timeline */}
          <div className="bg-[#1e1e22] rounded-xl p-4 border border-[#2a2a2e]">
            <LeadTimeline interactions={interactions} />
          </div>
        </div>
      </div>

      {/* Modals */}
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
        onCompareceu={async (valor) => {
          const ok = await registrarComparecimentoEProposta(lead.id, valor);
          if (ok) { toast.success("Proposta registrada!"); refreshLead(); }
        }}
        onNaoCompareceu={() => {
          registrarNaoComparecimento(lead.id);
          setAgendamentoReagendar(true);
        }}
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
          if (ok) { toast.success("Lead marcado como perdido."); refreshLead(); }
        }}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
      <span className="text-xs text-slate-300 truncate">{value}</span>
    </div>
  );
}

function CommRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn("text-xs", value ? "text-slate-300" : "text-slate-600")}>{value || "Pendente"}</span>
    </div>
  );
}
