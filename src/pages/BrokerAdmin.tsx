import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, RefreshCw, FileSpreadsheet, WifiOff } from "lucide-react";
import { useCallback } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import LeadsTable from "@/components/admin/LeadsTable";
import { AddLeadModal } from "@/components/admin/AddLeadModal";
import { CsvImportModal } from "@/components/admin/CsvImportModal";
import { KanbanBoard } from "@/components/crm";
import { BrokerLayout } from "@/components/broker";
import { BrokerRoletas } from "@/components/broker/BrokerRoletas";
import { LeadStatus } from "@/types/crm";
import { Button } from "@/components/ui/button";

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
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<"kanban" | "list">(() =>
    (location.state as any)?.view === "list" ? "list" : "kanban"
  );
  const [isAddLeadOpen, setIsAddLeadOpen] = useState<boolean>(
    () => !!(location.state as any)?.openAddLead
  );
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [showDisconnectedModal, setShowDisconnectedModal] = useState(false);
  const { role, brokerId, isLoading: isRoleLoading, isLeader } = useUserRole();
  useEffect(() => {
    if (isRoleLoading) return;
    if (role === "admin") {
      navigate("/admin");
    } else if (role !== "broker") {
      navigate("/auth");
    }
  }, [role, isRoleLoading, navigate]);

  // Redirect to connection page if WhatsApp instance is not connected
  useEffect(() => {
    if (!brokerId) return;
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-instance-manager/status`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const json = await res.json();
        if (json.instance && json.instance.status !== "connected") {
          setShowDisconnectedModal(true);
        }
      } catch {
        // silently ignore — don't block the user
      }
    };
    check();
  }, [brokerId, navigate]);

  const fetchLeads = useCallback(async () => {
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
  }, [brokerId]);

  useEffect(() => {
    if (role === "broker" && brokerId) {
      fetchBrokerInfo();
      fetchLeads();
    }
  }, [role, brokerId, fetchLeads]);

  // Realtime subscription for leads
  useEffect(() => {
    if (!brokerId) return;

    const channel = supabase
      .channel(`broker-leads-${brokerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `broker_id=eq.${brokerId}`,
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brokerId, fetchLeads]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const handleAddLead = () => {
    setIsAddLeadOpen(true);
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

  const brokerInitial = broker?.name?.charAt(0).toUpperCase() || "C";

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
        <title>CRM | Copilot Broker</title>
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
        isLeader={isLeader}
      >
        {viewMode === "kanban" ? (
          <div className="flex-1 min-h-[400px] space-y-4">
            {brokerId && <BrokerRoletas brokerId={brokerId} />}
            <KanbanBoard brokerId={brokerId} isAdmin={false} onAddLead={() => setIsAddLeadOpen(true)} />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-6 lg:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsCsvImportOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-card text-primary border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Importar CSV</span>
              </button>
            </div>

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

      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onSuccess={handleAddLeadSuccess}
        defaultBrokerId={brokerId || undefined}
        hideBrokerSelect={true}
      />

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onSuccess={handleAddLeadSuccess}
        defaultBrokerId={brokerId || undefined}
        hideBrokerSelect={true}
      />

      {/* WhatsApp Disconnected Modal */}
      {showDisconnectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a1d] border border-[#2a2a2e] rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-white text-lg font-semibold mb-2">WhatsApp Desconectado</h2>
            <p className="text-slate-400 text-sm mb-6">
              Sua instância do WhatsApp está desconectada. Conecte-se para continuar usando o CoPilot.
            </p>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => navigate("/corretor/copiloto")}
            >
              Ir para Conexão
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default BrokerAdmin;
