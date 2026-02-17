import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Building2, Users, Search, MapPin, X, Play } from "lucide-react";
import { toast } from "sonner";
import { CRMLead, LeadStatus, STATUS_CONFIG, LEAD_ORIGINS, getOriginDisplayLabel } from "@/types/crm";
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
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
}

const STATUSES: LeadStatus[] = ['new', 'info_sent', 'scheduling', 'docs_received', 'registered'];
const STATUS_ORDER: LeadStatus[] = ['new', 'info_sent', 'scheduling', 'docs_received', 'registered'];

export function KanbanBoard({ brokerId, isAdmin = false, brokers: brokersProp = [], searchTerm = "", onSearchChange }: KanbanBoardProps) {
  const navigate = useNavigate();
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const { data: customOrigins = [] } = useCustomOrigins();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null); // kept for sheet fallback
  const [activeLead, setActiveLead] = useState<CRMLead | null>(null);
  const [whatsappCampaignOpen, setWhatsappCampaignOpen] = useState(false);
  const [whatsappPreselectedStatus, setWhatsappPreselectedStatus] = useState<LeadStatus | undefined>();
  const [localBrokers, setLocalBrokers] = useState<{ id: string; name: string; slug: string }[]>([]);

  // Modal states
  const [agendamentoModal, setAgendamentoModal] = useState<{ open: boolean; leadId: string | null; isReagendamento?: boolean }>({ open: false, leadId: null });
  const [comparecimentoModal, setComparecimentoModal] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null });
  const [propostaModal, setPropostaModal] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null });
  const [vendaModal, setVendaModal] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null });
  const [perdaModal, setPerdaModal] = useState<{ open: boolean; leadId: string | null; currentStatus: LeadStatus }>({ open: false, leadId: null, currentStatus: "new" });
  const [iniciarModal, setIniciarModal] = useState<{ open: boolean; leadId: string | null; message: string }>({ open: false, leadId: null, message: "" });
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const newLeadTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Notification sound (short chime as base64 data URI)
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
    
    // Clear previous timeout for same lead if any
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

  const {
    leads, isLoading, fetchLeads, updateLeadStatus, updateLead, inactivateLead, deleteLead, getLeadsByStatus,
    iniciarAtendimento, registrarAgendamento, registrarComparecimento, registrarProposta, registrarComparecimentoEProposta, registrarNaoComparecimento, reagendarLead, confirmarVenda,
  } = useKanbanLeads({
    brokerId,
    isAdmin,
    projectId: selectedProject === "all" ? null : selectedProject,
    onNewLead: handleNewLead,
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm);
    const matchesBroker =
      selectedBroker === "all" ||
      lead.broker_id === selectedBroker ||
      (selectedBroker === "enove" && !lead.broker_id);
    const matchesProject =
      selectedProject === "all" ||
      lead.project_id === selectedProject;
    const matchesOrigin =
      selectedOrigins.length === 0 ||
      (selectedOrigins.includes("sem_origem") && !lead.lead_origin) ||
      (lead.lead_origin != null && selectedOrigins.includes(lead.lead_origin));
    return matchesSearch && matchesBroker && matchesProject && matchesOrigin;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  // Block drag that skips stages
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const leadId = active.id as string;
    const VALID_STATUSES: LeadStatus[] = ['new', 'info_sent', 'scheduling', 'docs_received', 'registered', 'inactive'];

    let newStatus: LeadStatus;
    if (VALID_STATUSES.includes(over.id as LeadStatus)) {
      newStatus = over.id as LeadStatus;
    } else {
      const targetLead = leads.find(l => l.id === over.id);
      if (!targetLead) return;
      newStatus = targetLead.status;
    }

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Validate adjacency
    const srcIdx = STATUS_ORDER.indexOf(lead.status);
    const dstIdx = STATUS_ORDER.indexOf(newStatus);
    if (srcIdx === -1 || dstIdx === -1 || Math.abs(dstIdx - srcIdx) > 1) {
      toast.error("Não é possível pular etapas no funil. Use os botões de ação.");
      return;
    }

    // For forward moves, require the modal flow (don't allow free advance via drag)
    if (dstIdx > srcIdx) {
      toast.info("Use o botão de ação para avançar o lead com os dados obrigatórios.");
      return;
    }

    // Backward move is allowed via drag (1 step back)
    await updateLeadStatus(leadId, lead.status, newStatus);
  }, [leads, updateLeadStatus]);

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
    const lead = leads.find(l => l.id === leadId);
    await updateLead(leadId, { lead_origin: origin }, {
      logOriginChange: true,
      oldOrigin: lead?.lead_origin
    });
  };

  // Contextual action handlers
  const handleIniciarAtendimento = async (leadId: string) => {
    setIniciarModal({ open: true, leadId, message: "" });
  };

  const handleConfirmIniciarAtendimento = async () => {
    if (!iniciarModal.leadId || !iniciarModal.message.trim()) return;
    const success = await iniciarAtendimento(iniciarModal.leadId);
    if (success) {
      // Log message to timeline
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase.from("lead_interactions").insert({
        lead_id: iniciarModal.leadId,
        interaction_type: "whatsapp_manual" as any,
        notes: iniciarModal.message,
        channel: "whatsapp",
        created_by: userId,
      });
      toast.success("Atendimento iniciado!");
      const lead = leads.find(l => l.id === iniciarModal.leadId);
      if (lead) {
        const cleanPhone = lead.whatsapp.replace(/\D/g, "");
        window.location.href = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(iniciarModal.message)}`;
      }
      setIniciarModal({ open: false, leadId: null, message: "" });
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

  return (
    <div className="flex flex-col min-h-[700px]">
      {/* Toolbar - Filters */}
      <div className="flex flex-col gap-2 md:gap-0 mb-4 md:mb-6 px-1">
        {/* Mobile search - full width on top */}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 md:gap-4 min-w-max">
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                leads={filteredLeads.filter(l => l.status === status)}
                newLeadIds={newLeadIds}
                onCardClick={handleCardClick}
                onUpdateOrigin={handleUpdateOrigin}
                onDelete={isAdmin ? handleDeleteLead : undefined}
                onIniciarAtendimento={handleIniciarAtendimento}
                onOpenAgendamento={handleOpenAgendamento}
                onOpenComparecimento={handleOpenComparecimento}
                onOpenVenda={handleOpenVenda}
                onOpenPerda={handleOpenPerda}
                onDispatchWhatsApp={handleDispatchWhatsApp}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="opacity-90">
                <KanbanCard lead={activeLead} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
          fetchLeads();
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
            // Open proposta modal automatically
            setPropostaModal({ open: true, leadId: comparecimentoModal.leadId });
          }
        }}
        onNaoCompareceu={() => {
          if (!comparecimentoModal.leadId) return;
          registrarNaoComparecimento(comparecimentoModal.leadId);
          const lead = leads.find(l => l.id === comparecimentoModal.leadId);
          if (lead) {
            setAgendamentoModal({ open: true, leadId: comparecimentoModal.leadId, isReagendamento: true });
          }
        }}
      />

      <PropostaModal
        open={propostaModal.open}
        onOpenChange={(v) => setPropostaModal(prev => ({ ...prev, open: v }))}
        onConfirm={async (data) => {
          if (!propostaModal.leadId) return false;
          const success = await registrarProposta(propostaModal.leadId, data.valor_proposta);
          if (success) toast.success("Proposta registrada!");
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

      {/* Iniciar Atendimento Modal */}
      <Dialog open={iniciarModal.open} onOpenChange={(v) => { if (!v) setIniciarModal({ open: false, leadId: null, message: "" }); }}>
        <DialogContent className="bg-[#111114] border-[#2a2a2e] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-200">Iniciar Atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Escreva a mensagem que será enviada ao lead via WhatsApp:</p>
            <Textarea
              autoFocus
              placeholder="Escreva sua mensagem aqui..."
              value={iniciarModal.message}
              onChange={(e) => setIniciarModal(prev => ({ ...prev, message: e.target.value }))}
              className="min-h-[100px] bg-[#0a0a0d] border-[#2a2a2e] text-sm text-slate-200 placeholder:text-slate-600 resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIniciarModal({ open: false, leadId: null, message: "" })} className="text-xs text-slate-400">
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!iniciarModal.message.trim()}
                onClick={handleConfirmIniciarAtendimento}
                className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />Iniciar e Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
