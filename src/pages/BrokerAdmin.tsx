import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Search, RefreshCw, ExternalLink, Copy, Check, Building2, ArrowRight } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { useBrokerProjects } from "@/hooks/use-broker-projects";
import LeadsTable from "@/components/admin/LeadsTable";
import { AddLeadModal } from "@/components/admin/AddLeadModal";
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
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const navigate = useNavigate();
  const { role, brokerId, isLoading: isRoleLoading } = useUserRole();
  
  const { brokerProjects, isLoading: isProjectsLoading } = useBrokerProjects(brokerId);

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

  const copyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const openLanding = (url: string) => {
    window.open(url, "_blank");
  };

  const handleAddLead = () => {
    setIsAddLeadOpen(true);
  };

  const handleAddLeadSuccess = () => {
    fetchLeads();
    setIsAddLeadOpen(false);
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
        <link rel="manifest" href="/manifest-crm-broker.json" />
        <link rel="apple-touch-icon" href="/favicon-enove.jpg" />
        <meta name="apple-mobile-web-app-title" content="CRM" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0f0f12" />
      </Helmet>
      <BrokerLayout
      brokerName={broker?.name}
      brokerInitial={brokerInitial}
      viewMode={viewMode}
      onViewChange={setViewMode}
      onLogout={handleLogout}
      onCopyLink={() => brokerProjects[0] && copyUrl(brokerProjects[0].url)}
      onOpenLanding={() => brokerProjects[0] && openLanding(brokerProjects[0].url)}
      onAddLead={handleAddLead}
      searchTerm={viewMode === "list" ? searchTerm : undefined}
      onSearchChange={viewMode === "list" ? setSearchTerm : undefined}
    >
      {/* Multi-project Links Card */}
      {broker && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-white">Seus Links de Captação</p>
            </div>
            <button
              onClick={() => navigate("/corretor/empreendimentos")}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Gerenciar
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          {isProjectsLoading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : brokerProjects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum empreendimento associado.
              </p>
              <button
                onClick={() => navigate("/corretor/empreendimentos")}
                className="text-sm text-primary hover:underline"
              >
                Adicionar empreendimentos
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {brokerProjects.slice(0, 3).map((bp) => (
                <div
                  key={bp.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {bp.project.name}
                    </p>
                    <code className="text-xs text-muted-foreground truncate block">
                      {bp.url}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyUrl(bp.url)}
                      className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {copiedUrl === bp.url ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openLanding(bp.url)}
                      className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {brokerProjects.length > 3 && (
                <button
                  onClick={() => navigate("/corretor/empreendimentos")}
                  className="w-full text-center py-2 text-sm text-primary hover:underline"
                >
                  Ver todos ({brokerProjects.length} empreendimentos)
                </button>
              )}
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
    </>
  );
};

export default BrokerAdmin;
