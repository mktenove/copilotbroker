import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Calendar, Phone, RefreshCw, UserCog, FileSpreadsheet } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const PAGE_SIZE = 50;

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<"crm" | "leads" | "brokers" | "roletas" | "projects" | "analytics">("crm");
  const [currentPage, setCurrentPage] = useState(0);
  
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const navigate = useNavigate();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const queryClient = useQueryClient();

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, filters]);

  // === REACT QUERY: Brokers (always loaded) ===
  const { data: brokers = [] } = useQuery<Broker[]>({
    queryKey: ["admin-brokers"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("brokers" as any)
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name") as any);
      if (error) throw error;
      return (data || []) as Broker[];
    },
    enabled: role === "admin",
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // === REACT QUERY: Projects (always loaded) ===
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Project[];
    },
    enabled: role === "admin",
    staleTime: 5 * 60 * 1000,
  });

  // === REACT QUERY: Leads count (for stats, only on leads tab) ===
  const { data: totalLeadsCount = 0 } = useQuery<number>({
    queryKey: ["admin-leads-count"],
    queryFn: async () => {
      const { count, error } = await (supabase
        .from("leads" as any)
        .select("id", { count: "exact", head: true }) as any);
      if (error) throw error;
      return count || 0;
    },
    enabled: role === "admin" && activeTab === "leads",
    staleTime: 120 * 1000,
  });

  // Build server-side filter query
  const buildLeadsQuery = useCallback((countOnly = false) => {
    let query = supabase
      .from("leads" as any)
      .select(
        countOnly
          ? "id"
          : "id, name, whatsapp, email, created_at, source, status, lead_origin, last_interaction_at, registered_at, broker_id, project_id, broker:brokers!leads_broker_id_fkey(name, slug)",
        countOnly ? { count: "exact", head: true } : undefined
      );

    // Status filter
    if (filters.statusFilter.length > 0) {
      query = query.in("status", filters.statusFilter);
    } else if (!filters.includeInactive) {
      query = query.neq("status", "inactive");
    }

    // Broker filter
    if (filters.brokerFilter === "enove") {
      query = query.is("broker_id", null);
    } else if (filters.brokerFilter !== "all") {
      query = query.eq("broker_id", filters.brokerFilter);
    }

    // Origin filter
    if (filters.originFilter.length > 0) {
      query = query.in("lead_origin", filters.originFilter);
    }

    // Project filter
    if (filters.projectFilter !== "all") {
      query = query.eq("project_id", filters.projectFilter);
    }

    // Date filters
    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo.getTime() + 86400000);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    // Search
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
    }

    return query;
  }, [filters, searchTerm]);

  // === REACT QUERY: Filtered leads count ===
  const { data: filteredCount = 0 } = useQuery<number>({
    queryKey: ["admin-leads-filtered-count", filters, searchTerm],
    queryFn: async () => {
      const { count, error } = await (buildLeadsQuery(true) as any);
      if (error) throw error;
      return count || 0;
    },
    enabled: role === "admin" && activeTab === "leads",
    staleTime: 60 * 1000,
  });

  // === REACT QUERY: Paginated leads ===
  const { data: paginatedLeads = [], isLoading: isLeadsLoading } = useQuery<Lead[]>({
    queryKey: ["admin-leads-page", filters, searchTerm, currentPage],
    queryFn: async () => {
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await (buildLeadsQuery()
        .order("created_at", { ascending: false })
        .range(from, to) as any);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: role === "admin" && activeTab === "leads",
    staleTime: 60 * 1000,
  });

  // === REACT QUERY: Today leads count (for stats card) ===
  const { data: todayLeadsCount = 0 } = useQuery<number>({
    queryKey: ["admin-leads-today-count"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error } = await (supabase
        .from("leads" as any)
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString()) as any);
      if (error) throw error;
      return count || 0;
    },
    enabled: role === "admin" && activeTab === "leads",
    staleTime: 120 * 1000,
  });

  // === REACT QUERY: Enove vs broker counts ===
  const { data: enoveCount = 0 } = useQuery<number>({
    queryKey: ["admin-leads-enove-count"],
    queryFn: async () => {
      const { count, error } = await (supabase
        .from("leads" as any)
        .select("id", { count: "exact", head: true })
        .is("broker_id", null) as any);
      if (error) throw error;
      return count || 0;
    },
    enabled: role === "admin" && activeTab === "leads",
    staleTime: 120 * 1000,
  });

  const brokerLeadsCount = totalLeadsCount - enoveCount;

  const handleDeleteLead = async (leadId: string) => {
    try {
      await (supabase.from("lead_documents" as any).delete().eq("lead_id", leadId) as any);
      await (supabase.from("lead_interactions" as any).delete().eq("lead_id", leadId) as any);
      await (supabase.from("lead_attribution" as any).delete().eq("lead_id", leadId) as any);
      
      const { error } = await (supabase.from("leads" as any).delete().eq("id", leadId) as any);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Lead excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      toast.error("Erro ao excluir lead.");
    }
  };

  const handleInactivateLead = async (leadId: string, reason: string) => {
    try {
      const lead = paginatedLeads.find(l => l.id === leadId);
      if (!lead) return;

      const { error: updateError } = await (supabase
        .from("leads" as any)
        .update({
          status: "inactive",
          inactivation_reason: reason,
          inactivated_at: new Date().toISOString(),
        })
        .eq("id", leadId) as any);

      if (updateError) throw updateError;

      await (supabase.from("lead_interactions" as any).insert({
        lead_id: leadId,
        interaction_type: "inactivation",
        old_status: lead.status,
        new_status: "inactive",
        notes: `Lead inativado. Motivo: ${reason}`,
      }) as any);

      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
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

      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
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
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
  };

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

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

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
        <title>CRM | Copilot Broker</title>
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
                  <p className="text-xl sm:text-2xl font-bold text-white">{totalLeadsCount}</p>
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
                  <p className="text-xl sm:text-2xl font-bold text-white">{todayLeadsCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFFF00]/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFFF00]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-400">Direto</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{enoveCount}</p>
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
                  <p className="text-xl sm:text-2xl font-bold text-white">{brokerLeadsCount}</p>
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
              leads={paginatedLeads} 
              filename={`leads${filters.brokerFilter !== "all" ? `-${filters.brokerFilter === "enove" ? "enove" : brokers.find(b => b.id === filters.brokerFilter)?.slug || "corretor"}` : ""}${filters.statusFilter.length === 1 ? `-${filters.statusFilter[0]}` : ""}`} 
            />
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-leads"] })}
              disabled={isLeadsLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1e1e22] text-[#FFFF00] border border-[#2a2a2e] rounded-lg hover:bg-[#2a2a2e] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLeadsLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>

          {/* Leads Table */}
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
            <LeadsTable
              leads={paginatedLeads}
              isLoading={isLeadsLoading}
              searchTerm={searchTerm}
              showSource={true}
              showStatus={true}
              onLeadClick={handleLeadClick}
              onDelete={handleDeleteLead}
              onInactivate={handleInactivateLead}
              onReactivate={handleReactivateLead}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={filteredCount}
              onPageChange={setCurrentPage}
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
