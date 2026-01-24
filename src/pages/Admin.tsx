import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Users, Calendar, Phone, RefreshCw, UserCog, BarChart3, Kanban, Building2 } from "lucide-react";
import logoEnove from "@/assets/logo-enove.png";
import { useUserRole } from "@/hooks/use-user-role";
import LeadsTable from "@/components/admin/LeadsTable";
import ExportButton from "@/components/admin/ExportButton";
import LeadsAdvancedFilters, { LeadFilters } from "@/components/admin/LeadsAdvancedFilters";
import BrokerManagement from "@/components/admin/BrokerManagement";
import ProjectManagement from "@/components/admin/ProjectManagement";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { KanbanBoard, LeadDetailSheet } from "@/components/crm";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LeadStatus, CRMLead } from "@/types/crm";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  email?: string | null;
  created_at: string;
  source: string;
  status: LeadStatus;
  lead_origin?: string | null;
  last_interaction_at?: string | null;
  registered_at?: string | null;
  broker_id: string | null;
  broker?: {
    name: string;
    slug: string;
  } | null;
}

interface Broker {
  id: string;
  name: string;
  slug: string;
}

const initialFilters: LeadFilters = {
  statusFilter: [],
  brokerFilter: "all",
  originFilter: [],
  dateFrom: undefined,
  dateTo: undefined,
  includeInactive: false,
};

const Admin = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<"crm" | "leads" | "brokers" | "projects" | "analytics">("crm");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const navigate = useNavigate();
  const { role, isLoading: isRoleLoading } = useUserRole();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Redirecionar se for corretor
  useEffect(() => {
    if (!isRoleLoading && role === "broker") {
      navigate("/corretor/admin");
    }
  }, [role, isRoleLoading, navigate]);

  useEffect(() => {
    if (role === "admin") {
      fetchLeads();
      fetchBrokers();
    }
  }, [role]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("leads" as any)
        .select(`
          *,
          broker:brokers(name, slug)
        `)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setLeads((data || []) as Lead[]);
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
      toast.error("Erro ao carregar leads.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrokers = async () => {
    try {
      const { data, error } = await (supabase
        .from("brokers" as any)
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name") as any);

      if (error) throw error;
      setBrokers((data || []) as Broker[]);
    } catch (error) {
      console.error("Erro ao buscar corretores:", error);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      // Deletar dados relacionados primeiro
      await (supabase.from("lead_documents" as any).delete().eq("lead_id", leadId) as any);
      await (supabase.from("lead_interactions" as any).delete().eq("lead_id", leadId) as any);
      await (supabase.from("lead_attribution" as any).delete().eq("lead_id", leadId) as any);
      
      // Deletar o lead
      const { error } = await (supabase.from("leads" as any).delete().eq("id", leadId) as any);
      
      if (error) throw error;
      
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      toast.success("Lead excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      toast.error("Erro ao excluir lead.");
    }
  };

  const handleInactivateLead = async (leadId: string, reason: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      // Atualizar lead no banco
      const { error: updateError } = await (supabase
        .from("leads" as any)
        .update({
          status: "inactive",
          inactivation_reason: reason,
          inactivated_at: new Date().toISOString(),
        })
        .eq("id", leadId) as any);

      if (updateError) throw updateError;

      // Registrar interação
      await (supabase.from("lead_interactions" as any).insert({
        lead_id: leadId,
        interaction_type: "inactivation",
        old_status: lead.status,
        new_status: "inactive",
        notes: `Lead inativado. Motivo: ${reason}`,
      }) as any);

      // Atualizar estado local
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, status: "inactive" as LeadStatus } : l
      ));
      
      toast.success("Lead inativado com sucesso!");
    } catch (error) {
      console.error("Erro ao inativar lead:", error);
      toast.error("Erro ao inativar lead.");
    }
  };

  const handleLeadClick = (lead: Lead) => {
    // Converter Lead para CRMLead para o sheet
    const crmLead: CRMLead = {
      id: lead.id,
      name: lead.name,
      whatsapp: lead.whatsapp,
      email: lead.email || null,
      cpf: null,
      notes: null,
      source: lead.source,
      lead_origin: lead.lead_origin || null,
      status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.created_at,
      last_interaction_at: lead.last_interaction_at || null,
      registered_at: lead.registered_at || null,
      registered_by: null,
      inactivation_reason: null,
      inactivated_at: null,
      inactivated_by: null,
      broker_id: lead.broker_id,
      project_id: null,
      broker: lead.broker ? { 
        id: lead.broker_id || "", 
        name: lead.broker.name, 
        slug: lead.broker.slug 
      } : null,
    };
    setSelectedLead(crmLead);
  };

  const handleUpdateLead = async (leadId: string, updates: Partial<CRMLead>) => {
    try {
      const { error } = await (supabase
        .from("leads" as any)
        .update(updates)
        .eq("id", leadId) as any);

      if (error) throw error;

      // Atualizar estado local
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, ...updates } : l
      ));
      
      // Atualizar lead selecionado
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
      }
      
      toast.success("Lead atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast.error("Erro ao atualizar lead.");
    }
  };

  const handleStatusChange = async (leadId: string, oldStatus: LeadStatus, newStatus: LeadStatus) => {
    try {
      const updates: Partial<Lead> = { 
        status: newStatus,
        last_interaction_at: new Date().toISOString(),
      };
      
      if (newStatus === "registered") {
        updates.registered_at = new Date().toISOString();
      }

      const { error: updateError } = await (supabase
        .from("leads" as any)
        .update(updates)
        .eq("id", leadId) as any);

      if (updateError) throw updateError;

      // Registrar interação
      await (supabase.from("lead_interactions" as any).insert({
        lead_id: leadId,
        interaction_type: "statusChange",
        old_status: oldStatus,
        new_status: newStatus,
      }) as any);

      // Atualizar estado local
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, ...updates } : l
      ));
      
      // Atualizar lead selecionado
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { 
          ...prev, 
          ...updates,
          broker: prev.broker ? { ...prev.broker } : null 
        } as CRMLead : null);
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.whatsapp.includes(searchTerm);

      // Status filter
      const matchesStatus =
        filters.statusFilter.length === 0 ||
        filters.statusFilter.includes(lead.status);

      // Broker filter
      let matchesBroker = true;
      if (filters.brokerFilter === "enove") {
        matchesBroker = lead.source === "enove" || !lead.broker_id;
      } else if (filters.brokerFilter !== "all") {
        matchesBroker = lead.broker_id === filters.brokerFilter;
      }

      // Origin filter
      const matchesOrigin =
        filters.originFilter.length === 0 ||
        filters.originFilter.includes(lead.lead_origin || "unknown");

      // Date filters
      const leadDate = new Date(lead.created_at);
      const matchesDateFrom = !filters.dateFrom || leadDate >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || leadDate <= new Date(filters.dateTo.getTime() + 86400000); // Include whole day

      // Include inactive filter
      const matchesActive = filters.includeInactive || lead.status !== "inactive";

      return matchesSearch && matchesStatus && matchesBroker && matchesOrigin && matchesDateFrom && matchesDateTo && matchesActive;
    });
  }, [leads, searchTerm, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.statusFilter.length > 0) count += filters.statusFilter.length;
    if (filters.brokerFilter !== "all") count += 1;
    if (filters.originFilter.length > 0) count += filters.originFilter.length;
    if (filters.dateFrom) count += 1;
    if (filters.dateTo) count += 1;
    if (filters.includeInactive) count += 1;
    return count;
  }, [filters]);

  const todayLeads = leads.filter(
    (l) => new Date(l.created_at).toDateString() === new Date().toDateString()
  );

  const enoveLeads = leads.filter((l) => l.source === "enove" || !l.broker_id);
  const brokerLeads = leads.filter((l) => l.broker_id);

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={logoEnove} alt="Enove Imobiliária" className="h-8 sm:h-10" />
            <div>
              <h1 className="text-base sm:text-lg font-serif font-bold text-foreground">Painel Admin</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Enove Imobiliária</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="container px-4">
          <nav className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("crm")}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "crm"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="w-4 h-4 inline-block mr-1 sm:mr-2" />
              <span>CRM</span>
            </button>
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "leads"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-1 sm:mr-2" />
              <span>Leads</span>
            </button>
            <button
              onClick={() => setActiveTab("brokers")}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "brokers"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCog className="w-4 h-4 inline-block mr-1 sm:mr-2" />
              <span>Corretores</span>
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "projects"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-4 h-4 inline-block mr-1 sm:mr-2" />
              <span>Empreendimentos</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "analytics"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4 inline-block mr-1 sm:mr-2" />
              <span>Analytics</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container px-4 py-6 sm:py-8">
        {activeTab === "crm" ? (
          <div className="h-[calc(100vh-200px)]">
            <KanbanBoard isAdmin={true} brokers={brokers} />
          </div>
        ) : activeTab === "leads" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="card-luxury p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{leads.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-luxury p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Hoje</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{todayLeads.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-luxury p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Enove</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{enoveLeads.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-luxury p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/50 flex items-center justify-center shrink-0">
                    <UserCog className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Corretores</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{brokerLeads.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters + Search */}
            <LeadsAdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              brokers={brokers}
              activeFiltersCount={activeFiltersCount}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />

            {/* Actions */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <ExportButton 
                leads={filteredLeads} 
                filename={`leads${filters.brokerFilter !== "all" ? `-${filters.brokerFilter === "enove" ? "enove" : brokers.find(b => b.id === filters.brokerFilter)?.slug || "corretor"}` : ""}${filters.statusFilter.length === 1 ? `-${filters.statusFilter[0]}` : ""}`} 
              />
              <button
                onClick={fetchLeads}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>

            {/* Leads Table */}
            <div className="card-luxury overflow-hidden">
              <LeadsTable
                leads={filteredLeads}
                isLoading={isLoading}
                searchTerm={searchTerm}
                showSource={true}
                showStatus={true}
                onLeadClick={handleLeadClick}
                onDelete={handleDeleteLead}
                onInactivate={handleInactivateLead}
              />
            </div>
          </>
        ) : activeTab === "brokers" ? (
          <BrokerManagement />
        ) : activeTab === "projects" ? (
          <ProjectManagement />
        ) : (
          <AnalyticsDashboard />
        )}
      </main>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleUpdateLead}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default Admin;
