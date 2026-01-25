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
import { RefreshCw, Building2, Users } from "lucide-react";
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

const STATUSES: LeadStatus[] = ['new', 'info_sent', 'docs_received', 'registered'];

export function KanbanBoard({ brokerId, isAdmin = false, brokers = [], searchTerm = "" }: KanbanBoardProps) {
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

  // Filter leads based on search, broker, and project
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

    return matchesSearch && matchesBroker && matchesProject;
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
    <div className="flex flex-col h-full">
      {/* Toolbar - Filters */}
      <div className="flex items-center gap-3 mb-4 md:mb-6 px-1">
        {/* Refresh Button */}
        <button
          onClick={fetchLeads}
          disabled={isLoading}
          className={cn(
            "flex items-center justify-center w-9 h-9 shrink-0 rounded-lg",
            "text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </button>

        {/* Filtro de Empreendimentos */}
        {isAdmin && projects.length > 0 && (
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-auto h-9 bg-transparent border-none text-slate-400 hover:text-slate-200 text-sm gap-2 px-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <SelectValue placeholder="Empreendimento" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Todos Empreendimentos</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro de Corretor */}
        {isAdmin && brokers.length > 0 && (
          <Select value={selectedBroker} onValueChange={setSelectedBroker}>
            <SelectTrigger className="w-auto h-9 bg-transparent border-none text-slate-400 hover:text-slate-200 text-sm gap-2 px-2">
              <Users className="w-4 h-4 text-slate-500" />
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Todos Corretores</SelectItem>
              <SelectItem value="enove">Enove (Direto)</SelectItem>
              {brokers.map(broker => (
                <SelectItem key={broker.id} value={broker.id}>
                  {broker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4 -mx-3 px-3 md:mx-0 md:px-0">
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
