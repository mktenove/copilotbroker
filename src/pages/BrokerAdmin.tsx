import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, RefreshCw, Building2, ArrowRight, AlertCircle, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { useBrokerProjects } from "@/hooks/use-broker-projects";
import LeadsTable from "@/components/admin/LeadsTable";
import { AddLeadModal } from "@/components/admin/AddLeadModal";
import { CsvImportModal } from "@/components/admin/CsvImportModal";
import { KanbanBoard } from "@/components/crm";
import { BrokerLayout } from "@/components/broker";
import { LeadStatus } from "@/types/crm";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  source: string;
  broker_id: string | null;
  status: LeadStatus;
}

interface BrokerInfo {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
}

const BrokerAdmin = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const navigate = useNavigate();
  const { role, brokerId, isLoading: isRoleLoading } = useUserRole();
  
  const { brokerProjects, isLoading: isProjectsLoading, totalProjects, pendingCount } = useBrokerProjects(brokerId);

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

  // Redirecionar se for admin
  useEffect(() => {
    if (!isRoleLoading && role === "admin") {
      navigate("/admin");
    }
    if (!isRoleLoading && role !== "broker") {
      navigate("/auth");
    }
  }, [role, isRoleLoading, navigate]);

  useEffect(() => {
    if (role === "broker" && brokerId) {
      fetchBrokerInfo();
      fetchLeads();
    }
  }, [role, brokerId]);

  const fetchBrokerInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await (supabase
        .from("brokers" as any)
        .select("id, name, slug, whatsapp")
        .eq("user_id", session.user.id)
        .maybeSingle() as any);

      if (error) throw error;
      setBroker(data as BrokerInfo);
    } catch (error) {
      console.error("Erro ao buscar info do corretor:", error);
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("leads" as any)
        .select("*")
        .eq("broker_id", brokerId)
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
    setIsAddLeadOpen(false);
    setIsCsvImportOpen(false);
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm)
  );

  const newLeads = leads.filter((l) => l.status === "new");

  const brokerInitial = broker?.name?.charAt(0).toUpperCase() || "C";

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "broker") {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>CRM | Enove</title>
      </Helmet>
      <BrokerLayout
        brokerName={broker?.name}
        brokerInitial={brokerInitial}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onLogout={handleLogout}
        onAddLead={handleAddLead}
        searchTerm={viewMode === "list" ? searchTerm : undefined}
        onSearchChange={viewMode === "list" ? setSearchTerm : undefined}
      >
      {/* Premium Projects Summary Card */}
      {broker && (
        <div 
          onClick={() => navigate("/corretor/empreendimentos")}
          className={cn(
            "bg-[#1e1e22] border rounded-lg p-3 mb-4 cursor-pointer transition-all duration-300 group",
            pendingCount > 0 
              ? "border-yellow-500/30 hover:border-yellow-500/60" 
              : "border-[#2a2a2e]/50 hover:border-primary/30"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Building2 className={cn(
                "w-5 h-5 shrink-0",
                pendingCount > 0 ? "text-yellow-500/70" : "text-muted-foreground/50"
              )} />
              <div>
                <p className="text-sm font-medium text-foreground">Seus Empreendimentos</p>
                {isProjectsLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando...</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-semibold">{brokerProjects.length}</span> de {totalProjects} ativos
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className={cn(
              "w-4 h-4 transition-all duration-300 group-hover:translate-x-1",
              pendingCount > 0 
                ? "text-yellow-500/60 group-hover:text-yellow-400" 
                : "text-muted-foreground/40 group-hover:text-primary"
            )} />
          </div>

          {/* Custom Ultra-thin Progress Bar */}
          {!isProjectsLoading && totalProjects > 0 && (
            <div className="h-[2px] w-full bg-border/30 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-primary via-yellow-400 to-primary rounded-full transition-all duration-500"
                style={{ width: `${(brokerProjects.length / totalProjects) * 100}%` }}
              />
            </div>
          )}

          {/* Pending Alert */}
          {!isProjectsLoading && pendingCount > 0 && (
            <div className="flex items-center gap-2 text-yellow-500/80 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                {pendingCount === 1 
                  ? "1 empreendimento disponível para adicionar" 
                  : `${pendingCount} empreendimentos disponíveis para adicionar`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        <div className={cn(
          "bg-[#1e1e22]/80 border rounded-lg p-3 sm:p-4 transition-colors duration-300",
          newLeads.length > 0 ? "border-primary/20" : "border-[#2a2a2e]/50"
        )}>
          <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground/60">
            Novos Leads
          </p>
          <div className="w-6 h-px bg-primary/30 my-1.5 sm:my-2" />
          <p className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
            {newLeads.length}
          </p>
        </div>
        <div className="bg-[#1e1e22]/80 border border-[#2a2a2e]/50 rounded-lg p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground/60">
            Total de Leads
          </p>
          <div className="w-6 h-px bg-primary/30 my-1.5 sm:my-2" />
          <p className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
            {leads.length}
          </p>
        </div>
      </div>

      {/* Kanban or List View */}
      {viewMode === "kanban" ? (
        <div className="flex-1 min-h-[400px]">
          <KanbanBoard brokerId={brokerId} isAdmin={false} />
        </div>
      ) : (
        <>
          {/* Search and Export - Mobile only (desktop has search in header) */}
          <div className="flex flex-col gap-3 mb-6 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome ou WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsCsvImportOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-card text-primary border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Importar CSV</span>
            </button>
            <button
              onClick={fetchLeads}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Leads Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <LeadsTable
              leads={filteredLeads}
              isLoading={isLoading}
              searchTerm={searchTerm}
              showSource={false}
            />
          </div>
        </>
      )}
    </BrokerLayout>

    {/* Add Lead Modal */}
    <AddLeadModal
      isOpen={isAddLeadOpen}
      onClose={() => setIsAddLeadOpen(false)}
      onSuccess={handleAddLeadSuccess}
      defaultBrokerId={brokerId || undefined}
      hideBrokerSelect={true}
    />

    {/* CSV Import Modal */}
    <CsvImportModal
      isOpen={isCsvImportOpen}
      onClose={() => setIsCsvImportOpen(false)}
      onSuccess={handleAddLeadSuccess}
      defaultBrokerId={brokerId || undefined}
      hideBrokerSelect={true}
    />
    </>
  );
};

export default BrokerAdmin;
