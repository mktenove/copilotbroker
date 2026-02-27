import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Search, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { CRMLead, LeadStatus, STATUS_CONFIG, LEAD_ORIGINS } from "@/types/crm";
import { useCustomOrigins } from "@/hooks/use-custom-origins";
import { useKanbanLeads } from "@/hooks/use-kanban-leads";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { LeadDetailSheet } from "./LeadDetailSheet";
import { AgendamentoModal } from "./AgendamentoModal";
import { ComparecimentoModal } from "./ComparecimentoModal";
import { PropostaModal } from "./PropostaModal";
import { VendaModal } from "./VendaModal";
import { PerdaModal } from "./PerdaModal";
import { NewCampaignSheet } from "@/components/whatsapp/NewCampaignSheet";
import { supabase } from "@/integrations/supabase/client";
import { cancelCadenciaForLead } from "@/hooks/use-cadencia-ativa";
import { usePropostas } from "@/hooks/use-propostas";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { KanbanColumnFilters } from "@/hooks/use-kanban-column";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Project {
  id: string;
  name: string;
  slug: string;
  city_slug: string;
}

interface KanbanBoardProps {
  brokerId?: string | null;
  isAdmin?: boolean;
  brokers?: { id: string; name: string; slug: string }[];
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onAddLead?: () => void;
}

const STATUSES: LeadStatus[] = ['new', 'info_sent', 'scheduling', 'docs_received', 'registered'];
const STATUS_ORDER: LeadStatus[] = ['new', 'info_sent', 'scheduling', 'docs_received', 'registered'];

export function KanbanBoard({ brokerId, isAdmin = false, brokers: brokersProp = [], searchTerm = "", onSearchChange, onAddLead }: KanbanBoardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const { data: customOrigins = [] } = useCustomOrigins();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  
  const [whatsappCampaignOpen, setWhatsappCampaignOpen] = useState(false);
  const [whatsappPreselectedStatus, setWhatsappPreselectedStatus] = useState<LeadStatus | undefined>();
  const [cadenciaLeadIds, setCadenciaLeadIds] = useState<Set<string>>(new Set());
  const [localBrokers, setLocalBrokers] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Lead lookup map populated by columns
  const allLeadsRef = useRef<Map<string, CRMLead>>(new Map());

  // Modal states
  const [agendamentoModal, setAgendamentoModal] = useState<{ open: boolean; leadId: string | null; isReagendamento?: boolean }>({ open: false, leadId: null });
  const [comparecimentoModal, setComparecimentoModal] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null });
  const [propostaModal, setPropostaModal] = useState<{ open: boolean; leadId: string | null; leadProjectId?: string | null; leadBrokerId?: string | null }>({ open: false, leadId: null });
  const [vendaModal, setVendaModal] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null });
  const [perdaModal, setPerdaModal] = useState<{ open: boolean; leadId: string | null; currentStatus: LeadStatus }>({ open: false, leadId: null, currentStatus: "new" });
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const newLeadTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { criarProposta } = usePropostas(propostaModal.leadId || "");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Browser may block audio before user interaction
    }
  }, []);

  const handleNewLead = useCallback((leadId: string, leadName: string) => {
    playNotificationSound();
    toast.success(`🆕 Novo lead: ${leadName}`);
    setNewLeadIds(prev => new Set(prev).add(leadId));

    const existing = newLeadTimeoutsRef.current.get(leadId);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      setNewLeadIds(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      newLeadTimeoutsRef.current.delete(leadId);
    }, 5000);
    newLeadTimeoutsRef.current.set(leadId, timeout);
  }, [playNotificationSound]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      newLeadTimeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (brokersProp.length > 0) return;
    const fetchBrokers = async () => {
      const { data } = await supabase
        .from("brokers")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");
      if (data) setLocalBrokers(data);
    };
    fetchBrokers();
  }, [brokersProp.length]);

  const brokers = brokersProp.length > 0 ? brokersProp : localBrokers;

  // Mutations only (no data fetching)
  const {
    invalidateAll, updateLeadStatus, updateLead, inactivateLead, deleteLead,
    iniciarAtendimento, registrarAgendamento, registrarComparecimento, registrarProposta,
    registrarComparecimentoEProposta, registrarNaoComparecimento, reagendarLead, confirmarVenda,
  } = useKanbanLeads({
    brokerId,
    isAdmin,
    projectId: selectedProject === "all" ? null : selectedProject,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      if (isAdmin) {
        const { data } = await supabase
          .from("projects")
          .select("id, name, slug, city_slug")
          .eq("is_active", true)
          .order("name");
        if (data) setProjects(data);
      } else if (brokerId) {
        const { data } = await supabase
          .from("broker_projects")
          .select("project:projects(id, name, slug, city_slug)")
          .eq("broker_id", brokerId)
          .eq("is_active", true);
        if (data) {
          const brokerProjects = data.map(bp => bp.project).filter((p): p is Project => p !== null);
          setProjects(brokerProjects);
        }
      }
    };
    fetchProjects();
  }, [isAdmin, brokerId]);

  // Fetch cadencia-active lead IDs
  useEffect(() => {
    const fetchCadencias = async () => {
      const { data } = await (supabase
        .from("whatsapp_campaigns")
        .select("lead_id") as any)
        .eq("status", "running")
        .not("lead_id", "is", null);
      if (data) {
        setCadenciaLeadIds(new Set(data.map((c: any) => c.lead_id).filter(Boolean)));
      }
    };
    fetchCadencias();

    const channel = supabase
      .channel("kanban-cadencias")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_campaigns" }, () => {
        fetchCadencias();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime subscription for lead changes → invalidate column queries
  useEffect(() => {
    const channel = supabase
      .channel('kanban-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;

        const affectedStatuses = new Set<string>();
        if (newRecord?.status) affectedStatuses.add(newRecord.status);
        if (oldRecord?.status) affectedStatuses.add(oldRecord.status);

        affectedStatuses.forEach(s => {
          queryClient.invalidateQueries({ queryKey: ["kanban-column", s] });
          queryClient.invalidateQueries({ queryKey: ["kanban-count", s] });
        });

        if (payload.eventType === 'INSERT' && newRecord?.status === 'new') {
          if (!isAdmin && brokerId && newRecord.broker_id !== brokerId) return;
          handleNewLead(newRecord.id, newRecord.name || 'Novo lead');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, brokerId, isAdmin, handleNewLead]);

  // Column filters
  const columnFilters: KanbanColumnFilters = useMemo(() => ({
    brokerId,
    isAdmin,
    projectId: selectedProject === "all" ? null : selectedProject,
    selectedBroker,
    selectedOrigins,
    searchTerm: debouncedSearch,
  }), [brokerId, isAdmin, selectedProject, selectedBroker, selectedOrigins, debouncedSearch]);

  // Lead lookup callback
  const handleLeadsLoaded = useCallback((leads: CRMLead[]) => {
    leads.forEach(l => allLeadsRef.current.set(l.id, l));
  }, []);


  const handleCardClick = (lead: CRMLead) => {
    navigate(`/corretor/lead/${lead.id}`);
  };

  const handleLeadUpdate = async (leadId: string, updates: Partial<CRMLead>) => {
    const success = await updateLead(leadId, updates);
    if (success && selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleStatusUpdate = async (leadId: string, oldStatus: LeadStatus, newStatus: LeadStatus) => {
    const success = await updateLeadStatus(leadId, oldStatus, newStatus);
    if (success && selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleUpdateOrigin = async (leadId: string, origin: string) => {
    const lead = allLeadsRef.current.get(leadId);
    await updateLead(leadId, { lead_origin: origin }, {
      logOriginChange: true,
      oldOrigin: lead?.lead_origin
    });
  };

  const handleIniciarAtendimento = async (leadId: string) => {
    const lead = allLeadsRef.current.get(leadId);
    const result = await iniciarAtendimento(leadId);
    if (result.success) {
      toast.success("Atendimento iniciado!");
      const userId = result.userId;
      supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "whatsapp_manual" as any,
        notes: "Atendimento iniciado — redirecionado para WhatsApp",
        channel: "whatsapp",
        created_by: userId,
      });
      if (lead) {
        const cleanPhone = lead.whatsapp.replace(/\D/g, "");
        window.open(`https://wa.me/55${cleanPhone}`, "_blank");
      }
    }
  };

  const handleOpenAgendamento = (leadId: string) => {
    setAgendamentoModal({ open: true, leadId });
  };

  const handleOpenComparecimento = (leadId: string) => {
    setComparecimentoModal({ open: true, leadId });
  };

  const handleOpenVenda = (leadId: string) => {
    setVendaModal({ open: true, leadId });
  };

  const handleOpenPerda = (leadId: string, currentStatus: LeadStatus) => {
    setPerdaModal({ open: true, leadId, currentStatus });
  };

  const handleDeleteLead = async (leadId: string) => {
    await deleteLead(leadId);
  };

  const handleDispatchWhatsApp = (status: LeadStatus) => {
    setWhatsappPreselectedStatus(status);
    setWhatsappCampaignOpen(true);
  };

  const handleCancelCadencia = async (leadId: string) => {
    await cancelCadenciaForLead(leadId);
    setCadenciaLeadIds(prev => { const next = new Set(prev); next.delete(leadId); return next; });
  };

  return (
    <div className="flex flex-col min-h-[700px]">
      {/* Toolbar - Filters */}
      <div className="flex flex-col gap-2 md:gap-0 mb-4 md:mb-6 px-1">
        {/* Mobile search */}
        <div className="md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={cn(
              "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
              "bg-[#1e1e22] border border-[#2a2a2e]",
              "text-slate-200 placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "transition-all duration-200"
            )}
          />
        </div>
        {/* Filters row + desktop search */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
        {(isAdmin || projects.length > 1) && projects.length > 0 && (
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-auto max-w-[140px] md:max-w-none h-9 bg-transparent border-none text-slate-400 hover:text-slate-200 text-sm gap-1 md:gap-2 px-2">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              <SelectValue placeholder="Empreend." className="truncate" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
              <SelectItem value="all">Todos</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 md:gap-2 h-9 px-2 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-[#2a2a2e]">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-[100px] md:max-w-none">
                {selectedOrigins.length === 0 ? "Todas origens" : `${selectedOrigins.length} origem${selectedOrigins.length > 1 ? "s" : ""}`}
              </span>
              {selectedOrigins.length > 0 && (
                <X className="w-3.5 h-3.5 ml-0.5 hover:text-destructive" onClick={(e) => { e.stopPropagation(); setSelectedOrigins([]); }} />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-[#1e1e22] border-[#2a2a2e]" align="start">
            <ScrollArea className="h-[256px]">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2e] cursor-pointer text-sm">
                  <Checkbox checked={selectedOrigins.includes("sem_origem")} onCheckedChange={() => setSelectedOrigins(prev => prev.includes("sem_origem") ? prev.filter(o => o !== "sem_origem") : [...prev, "sem_origem"])} />
                  Sem origem
                </label>
                {LEAD_ORIGINS.filter(o => o.key !== 'outro').map(origin => (
                  <label key={origin.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2e] cursor-pointer text-sm">
                    <Checkbox checked={selectedOrigins.includes(origin.key)} onCheckedChange={() => setSelectedOrigins(prev => prev.includes(origin.key) ? prev.filter(o => o !== origin.key) : [...prev, origin.key])} />
                    {origin.label}
                  </label>
                ))}
                {customOrigins.map(origin => (
                  <label key={origin} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2e] cursor-pointer text-sm">
                    <Checkbox checked={selectedOrigins.includes(origin)} onCheckedChange={() => setSelectedOrigins(prev => prev.includes(origin) ? prev.filter(o => o !== origin) : [...prev, origin])} />
                    {origin}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {isAdmin && brokers.length > 0 && (
          <Select value={selectedBroker} onValueChange={setSelectedBroker}>
            <SelectTrigger className="w-auto h-9 bg-transparent border-none text-slate-400 hover:text-slate-200 text-sm gap-2 px-2">
              <Users className="w-4 h-4 text-slate-500" />
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
              <SelectItem value="all">Corretor</SelectItem>
              <SelectItem value="enove">Enove (Direto)</SelectItem>
              {brokers.map(broker => (
                <SelectItem key={broker.id} value={broker.id}>{broker.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Desktop search */}
        <div className="hidden md:block relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={cn(
              "w-48 pl-9 pr-3 py-2 rounded-lg text-sm",
              "bg-[#1e1e22] border border-[#2a2a2e]",
              "text-slate-200 placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "transition-all duration-200"
            )}
          />
        </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scrollbar-subtle pb-4 -mx-3 px-3 md:mx-0 md:px-0">
          <div className="flex gap-3 md:gap-4 min-w-max">
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                filters={columnFilters}
                newLeadIds={newLeadIds}
                cadenciaLeadIds={cadenciaLeadIds}
                onCancelCadencia={handleCancelCadencia}
                onCardClick={handleCardClick}
                onUpdateOrigin={handleUpdateOrigin}
                onDelete={isAdmin ? handleDeleteLead : undefined}
                onIniciarAtendimento={handleIniciarAtendimento}
                onOpenAgendamento={handleOpenAgendamento}
                onOpenComparecimento={handleOpenComparecimento}
                onOpenVenda={handleOpenVenda}
                onOpenPerda={handleOpenPerda}
                onDispatchWhatsApp={handleDispatchWhatsApp}
                onAddLead={onAddLead}
                onOpenProposta={(lead) => {
                  setPropostaModal({ open: true, leadId: lead.id, leadProjectId: lead.project_id, leadBrokerId: lead.broker_id });
                }}
                onOpenReagendamento={(leadId) => setAgendamentoModal({ open: true, leadId, isReagendamento: true })}
                onLeadsLoaded={handleLeadsLoaded}
              />
            ))}
          </div>
      </div>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleLeadUpdate}
        onStatusChange={handleStatusUpdate}
        brokers={brokers}
        onTransferred={() => {
          setSelectedLead(null);
          invalidateAll();
        }}
      />

      {/* Modals */}
      <AgendamentoModal
        open={agendamentoModal.open}
        onOpenChange={(v) => setAgendamentoModal(prev => ({ ...prev, open: v }))}
        title={agendamentoModal.isReagendamento ? "Reagendar" : "Registrar Agendamento"}
        onConfirm={async (data, tipo) => {
          if (!agendamentoModal.leadId) return;
          if (agendamentoModal.isReagendamento) {
            const success = await reagendarLead(agendamentoModal.leadId, data, tipo);
            if (success) toast.success("Reagendamento registrado!");
          } else {
            const success = await registrarAgendamento(agendamentoModal.leadId, data, tipo);
            if (success) toast.success("Agendamento registrado!");
          }
        }}
      />

      <ComparecimentoModal
        open={comparecimentoModal.open}
        onOpenChange={(v) => setComparecimentoModal(prev => ({ ...prev, open: v }))}
        onCompareceu={async () => {
          if (!comparecimentoModal.leadId) return;
          const success = await registrarComparecimento(comparecimentoModal.leadId);
          if (success) {
            toast.success("Comparecimento registrado!");
          }
        }}
        onNaoCompareceu={() => {
          if (!comparecimentoModal.leadId) return;
          registrarNaoComparecimento(comparecimentoModal.leadId);
        }}
      />

      <PropostaModal
        open={propostaModal.open}
        onOpenChange={(v) => setPropostaModal(prev => ({ ...prev, open: v }))}
        leadProjectId={propostaModal.leadProjectId}
        leadBrokerId={propostaModal.leadBrokerId}
        projects={projects}
        onConfirm={async (data) => {
          if (!propostaModal.leadId) return false;
          const success = await criarProposta({
            ...data,
            lead_id: propostaModal.leadId,
          });
          if (success) {
            toast.success("Proposta registrada!");
          }
          return !!success;
        }}
      />

      <VendaModal
        open={vendaModal.open}
        onOpenChange={(v) => setVendaModal(prev => ({ ...prev, open: v }))}
        onConfirm={async (valorFinal, dataFechamento) => {
          if (!vendaModal.leadId) return;
          const success = await confirmarVenda(vendaModal.leadId, valorFinal, dataFechamento);
          if (success) toast.success("Venda confirmada! 🎉");
        }}
      />

      <PerdaModal
        open={perdaModal.open}
        onOpenChange={(v) => setPerdaModal(prev => ({ ...prev, open: v }))}
        onConfirm={async (reason) => {
          if (!perdaModal.leadId) return;
          const success = await inactivateLead(perdaModal.leadId, reason, perdaModal.currentStatus);
          if (success) toast.success("Lead marcado como perdido.");
        }}
      />

      <NewCampaignSheet
        open={whatsappCampaignOpen}
        onOpenChange={setWhatsappCampaignOpen}
        preselectedStatus={whatsappPreselectedStatus}
      />
    </div>
  );
}
