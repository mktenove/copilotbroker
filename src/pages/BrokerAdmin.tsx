import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Search, RefreshCw, Building2, ArrowRight, AlertCircle, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
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
      {/* Compact Projects Summary Card */}
      {broker && (
        <div 
          onClick={() => navigate("/corretor/empreendimentos")}
          className={cn(
            "bg-card border rounded-xl p-4 mb-6 cursor-pointer transition-colors group",
            pendingCount > 0 
              ? "border-amber-500/50 hover:border-amber-500" 
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                pendingCount > 0 ? "bg-amber-500/10" : "bg-primary/10"
              )}>
                <Building2 className={cn(
                  "w-5 h-5",
                  pendingCount > 0 ? "text-amber-500" : "text-primary"
                )} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Seus Empreendimentos</p>
                {isProjectsLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando...</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {brokerProjects.length} de {totalProjects} ativos
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className={cn(
              "w-5 h-5 transition-colors",
              pendingCount > 0 
                ? "text-amber-500 group-hover:text-amber-400" 
                : "text-muted-foreground group-hover:text-primary"
            )} />
          </div>

          {/* Progress Bar */}
          {!isProjectsLoading && totalProjects > 0 && (
            <Progress 
              value={(brokerProjects.length / totalProjects) * 100} 
              className={cn(
                "h-1.5 mb-2",
                pendingCount > 0 && "[&>div]:bg-amber-500"
              )}
            />
          )}

          {/* Pending Alert */}
          {!isProjectsLoading && pendingCount > 0 && (
            <div className="flex items-center gap-2 text-amber-500 text-xs">
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Novos</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{newLeads.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{leads.length}</p>
            </div>
          </div>
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
