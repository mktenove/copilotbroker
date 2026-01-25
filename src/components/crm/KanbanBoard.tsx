import { useState, useCallback, useEffect } from "react";
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
import { RefreshCw, Filter, Building2, Kanban, List, Table2 } from "lucide-react";
import { toast } from "sonner";
import { CRMLead, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { useKanbanLeads } from "@/hooks/use-kanban-leads";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { LeadDetailSheet } from "./LeadDetailSheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

type ViewMode = "kanban" | "list" | "table";

const STATUSES: LeadStatus[] = ['new', 'info_sent', 'docs_received', 'registered'];

export function KanbanBoard({ brokerId, isAdmin = false, brokers = [], searchTerm = "" }: KanbanBoardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [activeLead, setActiveLead] = useState<CRMLead | null>(null);

  const { leads, isLoading, fetchLeads, updateLeadStatus, updateLead, inactivateLead, deleteLead, getLeadsByStatus } = useKanbanLeads({
    brokerId,
    isAdmin,
    projectId: selectedProject === "all" ? null : selectedProject
  });

  // Fetch projects for admin filter
  useEffect(() => {
    if (isAdmin) {
      const fetchProjects = async () => {
        const { data } = await supabase
          .from("projects")
          .select("id, name, slug, city_slug")
          .eq("is_active", true)
          .order("name");
        
        if (data) {
          setProjects(data);
        }
      };
      fetchProjects();
    }
  }, [isAdmin]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Filter leads based on search and broker
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm);
    
    const matchesBroker = 
      selectedBroker === "all" || 
      lead.broker_id === selectedBroker ||
      (selectedBroker === "enove" && !lead.broker_id);

    return matchesSearch && matchesBroker;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;

    // Find the lead being moved
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Update status
    await updateLeadStatus(leadId, lead.status, newStatus);
  }, [leads, updateLeadStatus]);

  const handleCardClick = (lead: CRMLead) => {
    setSelectedLead(lead);
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

  const handleInactivateLead = async (leadId: string, reason: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const success = await inactivateLead(leadId, reason, lead.status);
      if (success) {
        toast.success("Lead inativado com sucesso!");
      }
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    await deleteLead(leadId);
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] rounded-2xl p-4">
      {/* Toolbar - TaskWhiz style */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#252545] border border-[#3a3a5c] rounded-full">
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              viewMode === "kanban" 
                ? "bg-primary text-primary-foreground" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              viewMode === "list" 
                ? "bg-primary text-primary-foreground" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              viewMode === "table" 
                ? "bg-primary text-primary-foreground" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tabela</span>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Project Filter */}
        {isAdmin && projects.length > 0 && (
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full sm:w-[180px] bg-[#252545] border-[#3a3a5c] text-slate-200 rounded-full">
              <Building2 className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent className="bg-[#252545] border-[#3a3a5c]">
              <SelectItem value="all" className="text-slate-200">Todos os projetos</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id} className="text-slate-200">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Broker Filter */}
        {isAdmin && brokers.length > 0 && (
          <Select value={selectedBroker} onValueChange={setSelectedBroker}>
            <SelectTrigger className="w-full sm:w-[180px] bg-[#252545] border-[#3a3a5c] text-slate-200 rounded-full">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent className="bg-[#252545] border-[#3a3a5c]">
              <SelectItem value="all" className="text-slate-200">Todos os corretores</SelectItem>
              <SelectItem value="enove" className="text-slate-200">Enove (direto)</SelectItem>
              {brokers.map(broker => (
                <SelectItem key={broker.id} value={broker.id} className="text-slate-200">
                  {broker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Refresh button */}
        <button
          onClick={fetchLeads}
          disabled={isLoading}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm shrink-0",
            "bg-[#252545] border border-[#3a3a5c] text-slate-200",
            "hover:bg-[#303055] hover:border-primary/40 transition-all"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-5 min-w-max">
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                leads={filteredLeads.filter(l => l.status === status)}
                onCardClick={handleCardClick}
                onUpdateOrigin={handleUpdateOrigin}
                onInactivate={handleInactivateLead}
                onDelete={isAdmin ? handleDeleteLead : undefined}
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
      />
    </div>
  );
}
