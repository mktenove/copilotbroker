import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Calendar, Phone, RefreshCw, UserCog, FileSpreadsheet } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import LeadsTable from "@/components/admin/LeadsTable";
import ExportButton from "@/components/admin/ExportButton";
import LeadsAdvancedFilters, { LeadFilters } from "@/components/admin/LeadsAdvancedFilters";
import BrokerManagement from "@/components/admin/BrokerManagement";
import ProjectManagement from "@/components/admin/ProjectManagement";
import IntelligenceDashboard from "@/components/admin/intelligence/IntelligenceDashboard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AddLeadModal } from "@/components/admin/AddLeadModal";
import { CsvImportModal } from "@/components/admin/CsvImportModal";
import RoletaManagement from "@/components/admin/RoletaManagement";
import { KanbanBoard } from "@/components/crm";
import { LeadStatus } from "@/types/crm";

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
  project_id: string | null;
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

interface Project {
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
  projectFilter: "all",
};

const Admin = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<"crm" | "leads" | "brokers" | "roletas" | "projects" | "analytics">("crm");
  
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const navigate = useNavigate();
  const { role, isLoading: isRoleLoading } = useUserRole();

  // CRM search term (separate from leads table search)
  const [crmSearchTerm, setCrmSearchTerm] = useState("");

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

  // Redirecionar se não for admin
  useEffect(() => {
    if (!isRoleLoading && role !== "admin") {
      if (role === "broker") {
        navigate("/corretor/admin");
      }
    }
  }, [role, isRoleLoading, navigate]);

  useEffect(() => {
    if (role === "admin") {
      fetchLeads();
      fetchBrokers();
      fetchProjects();
    }
  }, [role]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("leads" as any)
        .select(`
          *,
          broker:brokers!leads_broker_id_fkey(name, slug)
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

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error) {
      console.error("Erro ao buscar projetos:", error);
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

  const handleReactivateLead = async (leadId: string) => {
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await (supabase
        .from("leads" as any)
        .update({
          status: "new",
          inactivation_reason: null,
          inactivated_at: null,
          data_perda: null,
          etapa_perda: null,
          updated_at: now,
        })
        .eq("id", leadId) as any);

      if (updateError) throw updateError;

      await (supabase.from("lead_interactions" as any).insert({
        lead_id: leadId,
        interaction_type: "reactivation",
        old_status: "inactive",
        new_status: "new",
        notes: "Lead reativado",
      }) as any);

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, status: "new" as LeadStatus, inactivation_reason: null } : l
      ));
      
      toast.success("Lead reativado com sucesso!");
    } catch (error) {
      console.error("Erro ao reativar lead:", error);
      toast.error("Erro ao reativar lead.");
    }
  };

  const handleLeadClick = (lead: Lead) => {
    navigate(`/corretor/lead/${lead.id}`);
  };




  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const handleAddLead = () => {
    setIsAddLeadOpen(true);
  };

  const handleImportCsv = () => {
    setIsCsvImportOpen(true);
  };

  const handleAddLeadSuccess = () => {
    fetchLeads();
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

      // Project filter
      const matchesProject =
        filters.projectFilter === "all" ||
        lead.project_id === filters.projectFilter;

      // Date filters
      const leadDate = new Date(lead.created_at);
      const matchesDateFrom = !filters.dateFrom || leadDate >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || leadDate <= new Date(filters.dateTo.getTime() + 86400000); // Include whole day

      // Include inactive filter
      const matchesActive = filters.includeInactive || lead.status !== "inactive";

      return matchesSearch && matchesStatus && matchesBroker && matchesOrigin && matchesProject && matchesDateFrom && matchesDateTo && matchesActive;
    });
  }, [leads, searchTerm, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.statusFilter.length > 0) count += filters.statusFilter.length;
    if (filters.brokerFilter !== "all") count += 1;
    if (filters.originFilter.length > 0) count += filters.originFilter.length;
    if (filters.projectFilter !== "all") count += 1;
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
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#FFFF00]" />
      </div>
    );
  }

  if (role !== "admin") {
    const doLogout = async () => {
      await supabase.auth.signOut();
      navigate("/auth");
    };
    return (
      <div className="min-h-screen bg-[#0f0f12] flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-[#1e1e22] flex items-center justify-center">
          <UserCog className="w-8 h-8 text-slate-500" />
        </div>
        <h1 className="text-xl font-bold text-white">Acesso Restrito</h1>
        <p className="text-slate-400 text-center max-w-md">
          Você não tem permissão para acessar esta área. 
          Esta página é restrita a administradores.
        </p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-[#1e1e22] text-white font-medium rounded-xl border border-[#2a2a2e] hover:bg-[#2a2a2e] transition-all"
          >
            Voltar ao Início
          </button>
          <button
            onClick={doLogout}
            className="px-6 py-3 bg-[#FFFF00] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,255,0,0.3)] transition-all"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    );
  }

  const currentSearchTerm = activeTab === "crm" ? crmSearchTerm : searchTerm;
  const handleSearchChange = activeTab === "crm" ? setCrmSearchTerm : setSearchTerm;

  return (
    <>
      <Helmet>
        <title>CRM | Enove</title>
      </Helmet>
      <AdminLayout
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
        onLogout={handleLogout}
        searchTerm={currentSearchTerm}
        onSearchChange={handleSearchChange}
        onAddLead={handleAddLead}
        brokers={brokers}
      >
      {activeTab === "crm" ? (
        <KanbanBoard isAdmin={true} brokers={brokers} searchTerm={crmSearchTerm} onSearchChange={setCrmSearchTerm} onAddLead={() => setIsAddLeadOpen(true)} />
      ) : activeTab === "leads" ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFFF00]/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFFF00]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-400">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{leads.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFFF00]/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFFF00]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-400">Hoje</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{todayLeads.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFFF00]/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFFF00]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-400">Enove</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{enoveLeads.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFFF00]/10 flex items-center justify-center shrink-0">
                  <UserCog className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFFF00]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-400">Corretores</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{brokerLeads.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters + Search */}
          <LeadsAdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            brokers={brokers}
            projects={projects}
            activeFiltersCount={activeFiltersCount}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
            <button
              onClick={() => setIsCsvImportOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1e1e22] text-[#FFFF00] border border-[#2a2a2e] rounded-lg hover:bg-[#2a2a2e] transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="hidden sm:inline">Importar CSV</span>
            </button>
            <ExportButton 
              leads={filteredLeads} 
              filename={`leads${filters.brokerFilter !== "all" ? `-${filters.brokerFilter === "enove" ? "enove" : brokers.find(b => b.id === filters.brokerFilter)?.slug || "corretor"}` : ""}${filters.statusFilter.length === 1 ? `-${filters.statusFilter[0]}` : ""}`} 
            />
            <button
              onClick={fetchLeads}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1e1e22] text-[#FFFF00] border border-[#2a2a2e] rounded-lg hover:bg-[#2a2a2e] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>

          {/* Leads Table */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
            <LeadsTable
              leads={filteredLeads}
              isLoading={isLoading}
              searchTerm={searchTerm}
              showSource={true}
              showStatus={true}
              onLeadClick={handleLeadClick}
              onDelete={handleDeleteLead}
              onInactivate={handleInactivateLead}
              onReactivate={handleReactivateLead}
            />
          </div>
        </>
      ) : activeTab === "brokers" ? (
        <BrokerManagement />
      ) : activeTab === "roletas" ? (
        <RoletaManagement />
      ) : activeTab === "projects" ? (
        <ProjectManagement />
      ) : (
        <IntelligenceDashboard />
      )}


      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onSuccess={handleAddLeadSuccess}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onSuccess={handleAddLeadSuccess}
      />
    </AdminLayout>
    </>
  );
};

export default Admin;
