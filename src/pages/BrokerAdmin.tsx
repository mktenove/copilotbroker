import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Users, Calendar, Search, RefreshCw, ExternalLink, Copy, Check, Kanban, List } from "lucide-react";
import logoEnove from "@/assets/logo-enove.png";
import { useUserRole } from "@/hooks/use-user-role";
import LeadsTable from "@/components/admin/LeadsTable";
import ExportButton from "@/components/admin/ExportButton";
import { KanbanBoard } from "@/components/crm";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  source: string;
  broker_id: string | null;
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const navigate = useNavigate();
  const { role, brokerId, isLoading: isRoleLoading } = useUserRole();

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

  const copyLink = async () => {
    if (!broker) return;
    const url = `${window.location.origin}/estanciavelha/${broker.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm)
  );

  const todayLeads = leads.filter(
    (l) => new Date(l.created_at).toDateString() === new Date().toDateString()
  );

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#FFFF00]" />
      </div>
    );
  }

  if (role !== "broker") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] admin-scrollbar">
      {/* Header */}
      <header className="bg-[#141417]/95 backdrop-blur-sm border-b border-[#2a2a2e] sticky top-0 z-50">
        <div className="container px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={logoEnove} alt="Enove Imobiliária" className="h-8 sm:h-10" />
            <div>
              <h1 className="text-base sm:text-lg font-serif font-bold text-white">Meus Leads</h1>
              <p className="text-xs sm:text-sm text-slate-400">{broker?.name || "Carregando..."}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#1e1e22] border border-[#2a2a2e] rounded-lg p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "kanban" 
                    ? "bg-[#2a2a2e] text-[#FFFF00] shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
                title="Visualização Kanban"
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "list" 
                    ? "bg-[#2a2a2e] text-[#FFFF00] shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
                title="Visualização Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 sm:py-8">
        {/* Link da landing page */}
        {broker && (
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-400 mb-2">Sua landing page</p>
            <code className="block text-xs sm:text-sm bg-[#0f0f12] text-slate-300 px-3 py-2 rounded mb-3 break-all border border-[#2a2a2e]">
              {window.location.origin}/estanciavelha/{broker.slug}
            </code>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFFF00]/10 text-[#FFFF00] rounded-lg hover:bg-[#FFFF00]/20 transition-colors text-sm"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? "Copiado!" : "Copiar Link"}
              </button>
              <a
                href={`/estanciavelha/${broker.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFFF00] text-black font-medium rounded-lg hover:bg-[#FFFF00]/90 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir
              </a>
            </div>
          </div>
        )}

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
        </div>

        {/* Kanban or List View */}
        {viewMode === "kanban" ? (
          <div className="h-[calc(100vh-400px)] min-h-[400px]">
            <KanbanBoard brokerId={brokerId} isAdmin={false} />
          </div>
        ) : (
          <>
            {/* Search and Export */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#1e1e22] border border-[#2a2a2e] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFFF00]/50 focus:border-[#FFFF00]/50 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <ExportButton leads={filteredLeads} filename={`meus-leads`} />
                <button
                  onClick={fetchLeads}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#FFFF00]/10 text-[#FFFF00] rounded-lg hover:bg-[#FFFF00]/20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
              <LeadsTable
                leads={filteredLeads}
                isLoading={isLoading}
                searchTerm={searchTerm}
                showSource={false}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BrokerAdmin;
