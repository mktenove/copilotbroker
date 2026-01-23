import { useState, useCallback } from "react";
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
import { Search, RefreshCw, Filter } from "lucide-react";
import { CRMLead, LeadStatus, STATUS_CONFIG } from "@/types/crm";
import { useKanbanLeads } from "@/hooks/use-kanban-leads";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { LeadDetailSheet } from "./LeadDetailSheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KanbanBoardProps {
  brokerId?: string | null;
  isAdmin?: boolean;
  brokers?: { id: string; name: string; slug: string }[];
}

const STATUSES: LeadStatus[] = ['new', 'info_sent', 'docs_received', 'registered'];

export function KanbanBoard({ brokerId, isAdmin = false, brokers = [] }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [activeLead, setActiveLead] = useState<CRMLead | null>(null);

  const { leads, isLoading, fetchLeads, updateLeadStatus, updateLead, getLeadsByStatus } = useKanbanLeads({
    brokerId,
    isAdmin
  });

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {isAdmin && brokers.length > 0 && (
          <Select value={selectedBroker} onValueChange={setSelectedBroker}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar corretor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os corretores</SelectItem>
              <SelectItem value="enove">Enove (direto)</SelectItem>
              {brokers.map(broker => (
                <SelectItem key={broker.id} value={broker.id}>
                  {broker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <button
          onClick={fetchLeads}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
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
          <div className="flex gap-4 min-w-max">
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                leads={filteredLeads.filter(l => l.status === status)}
                onCardClick={handleCardClick}
                onUpdateOrigin={handleUpdateOrigin}
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
