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
import { Search, RefreshCw, Filter, LayoutGrid, List, X } from "lucide-react";
import { toast } from "sonner";
import { CRMLead, LeadStatus, STATUS_CONFIG, LEAD_ORIGINS, getOriginType, ORIGIN_TYPE_COLORS, getOriginDisplayLabel } from "@/types/crm";
import { useKanbanLeads } from "@/hooks/use-kanban-leads";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { LeadsListView } from "./LeadsListView";
import { LeadDetailSheet } from "./LeadDetailSheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  brokerId?: string | null;
  isAdmin?: boolean;
  brokers?: { id: string; name: string; slug: string }[];
}

type ViewMode = 'kanban' | 'list';

const STATUSES: LeadStatus[] = ['new', 'info_sent', 'docs_received', 'registered'];

export function KanbanBoard({ brokerId, isAdmin = false, brokers = [] }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [activeLead, setActiveLead] = useState<CRMLead | null>(null);

  const { leads, isLoading, fetchLeads, updateLeadStatus, updateLead, inactivateLead, deleteLead } = useKanbanLeads({
    brokerId,
    isAdmin
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm);
    
    const matchesBroker = 
      selectedBroker === "all" || 
      lead.broker_id === selectedBroker ||
      (selectedBroker === "enove" && !lead.broker_id);

    const matchesOrigin = 
      selectedOrigins.length === 0 ||
      selectedOrigins.includes(lead.lead_origin || '');

    const matchesStatus = 
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(lead.status);

    return matchesSearch && matchesBroker && matchesOrigin && matchesStatus;
  });

  const activeFiltersCount = 
    (selectedBroker !== "all" ? 1 : 0) + 
    selectedOrigins.length + 
    selectedStatuses.length;

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

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

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

  const toggleOrigin = (origin: string) => {
    setSelectedOrigins(prev => 
      prev.includes(origin) 
        ? prev.filter(o => o !== origin)
        : [...prev, origin]
    );
  };

  const toggleStatus = (status: LeadStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedBroker("all");
    setSelectedOrigins([]);
    setSelectedStatuses([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Premium Toolbar */}
      <div className="glass-card rounded-xl p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border/50 rounded-xl",
                "text-sm placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                "transition-all duration-200"
              )}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Broker Filter */}
            {isAdmin && brokers.length > 0 && (
              <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                <SelectTrigger className="w-[180px] bg-background/50 border-border/50 rounded-xl">
                  <SelectValue placeholder="Corretor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="enove">Enove (direto)</SelectItem>
                  {brokers.map(broker => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Advanced Filters Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium",
                  "bg-background/50 border-border/50 hover:border-primary/50 hover:bg-primary/5",
                  "transition-all duration-200",
                  activeFiltersCount > 0 && "border-primary/50 bg-primary/10 text-primary"
                )}>
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  {/* Status Filter */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Status</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map(status => {
                        const config = STATUS_CONFIG[status];
                        const isSelected = selectedStatuses.includes(status);
                        return (
                          <button
                            key={status}
                            onClick={() => toggleStatus(status)}
                            className={cn(
                              "filter-chip",
                              isSelected && "filter-chip-active"
                            )}
                          >
                            <span>{config.icon}</span>
                            <span>{config.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Origin Filter */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Origem</h4>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {LEAD_ORIGINS.slice(0, -1).map(origin => {
                        const isSelected = selectedOrigins.includes(origin.key);
                        return (
                          <button
                            key={origin.key}
                            onClick={() => toggleOrigin(origin.key)}
                            className={cn(
                              "filter-chip text-xs",
                              isSelected && "filter-chip-active"
                            )}
                          >
                            {origin.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Limpar todos os filtros
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* View Toggle */}
            <div className="flex items-center bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'kanban' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'list' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchLeads}
              disabled={isLoading}
              className={cn(
                "flex items-center justify-center p-2.5 rounded-xl",
                "bg-primary/10 text-primary hover:bg-primary/20",
                "transition-colors"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/30">
            {selectedStatuses.map(status => (
              <span key={status} className="filter-chip filter-chip-active">
                {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label.split(' ')[0]}
                <button onClick={() => toggleStatus(status)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedOrigins.map(origin => (
              <span key={origin} className="filter-chip filter-chip-active">
                {getOriginDisplayLabel(origin)}
                <button onClick={() => toggleOrigin(origin)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedBroker !== "all" && (
              <span className="filter-chip filter-chip-active">
                {selectedBroker === "enove" ? "Enove" : brokers.find(b => b.id === selectedBroker)?.name}
                <button onClick={() => setSelectedBroker("all")} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button 
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground ml-2"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <div className="h-full overflow-x-auto pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 min-w-max h-full">
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
                  <div className="opacity-95">
                    <KanbanCard lead={activeLead} onClick={() => {}} />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pb-4">
            <LeadsListView 
              leads={filteredLeads} 
              onLeadClick={handleCardClick} 
            />
          </div>
        )}
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
