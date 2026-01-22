import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Users, Calendar, Phone, Search, RefreshCw, UserCog } from "lucide-react";
import logoEnove from "@/assets/logo-enove.png";
import { useUserRole } from "@/hooks/use-user-role";
import LeadsTable from "@/components/admin/LeadsTable";
import ExportButton from "@/components/admin/ExportButton";
import BrokerManagement from "@/components/admin/BrokerManagement";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
  source: string;
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

const Admin = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"leads" | "brokers">("leads");
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm);

    let matchesSource = true;
    if (sourceFilter === "enove") {
      matchesSource = lead.source === "enove" || !lead.broker_id;
    } else if (sourceFilter !== "all") {
      matchesSource = lead.broker_id === sourceFilter;
    }

    return matchesSearch && matchesSource;
  });

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
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoEnove} alt="Enove Imobiliária" className="h-10" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-serif font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Enove Imobiliária</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="container">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "leads"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-2" />
              Leads
            </button>
            <button
              onClick={() => setActiveTab("brokers")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "brokers"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCog className="w-4 h-4 inline-block mr-2" />
              Corretores
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-8">
        {activeTab === "leads" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="card-luxury p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground">{leads.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-luxury p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hoje</p>
                    <p className="text-2xl font-bold text-foreground">{todayLeads.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-luxury p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Enove</p>
                    <p className="text-2xl font-bold text-foreground">{enoveLeads.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-luxury p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center">
                    <UserCog className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Corretores</p>
                    <p className="text-2xl font-bold text-foreground">{brokerLeads.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search, Filter and Export */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">Todos</option>
                <option value="enove">Enove</option>
                {brokers.map((broker) => (
                  <option key={broker.id} value={broker.id}>
                    {broker.name}
                  </option>
                ))}
              </select>
              <ExportButton leads={filteredLeads} filename={`leads-${sourceFilter}`} />
              <button
                onClick={fetchLeads}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
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
              />
            </div>
          </>
        ) : (
          <BrokerManagement />
        )}
      </main>
    </div>
  );
};

export default Admin;
