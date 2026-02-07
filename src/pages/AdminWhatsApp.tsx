import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Smartphone, 
  RefreshCw, 
  Wifi,
  Megaphone,
  Send,
  Shield,
  Bot,
  Eye,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWhatsAppGlobalStats } from "@/hooks/use-whatsapp-stats";
import { useWhatsAppOptouts } from "@/hooks/use-whatsapp-optouts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { WhatsAppOverviewTab } from "@/components/admin/WhatsAppOverviewTab";
import { ConnectionTab } from "@/components/whatsapp/ConnectionTab";
import { GlobalConnectionTab } from "@/components/whatsapp/GlobalConnectionTab";
import { CampaignsTab } from "@/components/whatsapp/CampaignsTab";
import { QueueTab } from "@/components/whatsapp/QueueTab";
import { SecurityTab } from "@/components/whatsapp/SecurityTab";
import { AutoMessageTab } from "@/components/whatsapp/AutoMessageTab";

interface BrokerInstance {
  id: string;
  broker_id: string;
  instance_name: string;
  phone_number: string | null;
  status: string;
  is_paused: boolean;
  daily_sent_count: number;
  hourly_sent_count: number;
  daily_limit: number;
  hourly_limit: number;
  warmup_day: number;
  warmup_stage: string;
  broker?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const AdminWhatsApp = () => {
  const navigate = useNavigate();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isRoleLoading && role !== "admin") {
      navigate("/auth");
    }
  }, [role, isRoleLoading, navigate]);

  // Fetch all instances
  const { data: instances = [], isLoading: isLoadingInstances, refetch: refetchInstances } = useQuery({
    queryKey: ["admin-whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broker_whatsapp_instances")
        .select(`
          *,
          broker:brokers(id, name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BrokerInstance[];
    },
    enabled: role === "admin",
  });

  const { allStats, globalTotals, isLoading: isLoadingStats } = useWhatsAppGlobalStats();
  const { optouts, isLoading: isLoadingOptouts } = useWhatsAppOptouts();

  // Toggle pause mutation
  const togglePauseMutation = useMutation({
    mutationFn: async ({ instanceId, isPaused }: { instanceId: string; isPaused: boolean }) => {
      const { error } = await supabase
        .from("broker_whatsapp_instances")
        .update({ 
          is_paused: isPaused,
          pause_reason: isPaused ? "Pausado pelo admin" : null
        })
        .eq("id", instanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Instância atualizada");
      queryClient.invalidateQueries({ queryKey: ["admin-whatsapp-instances"] });
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado!");
    navigate("/auth");
  };

  // Prepare chart data
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return format(date, "yyyy-MM-dd");
  });

  const chartData = last7Days.map((dateStr) => {
    const dayStats = allStats.filter(s => s.date === dateStr);
    return {
      date: format(parseISO(dateStr), "EEE", { locale: ptBR }),
      fullDate: format(parseISO(dateStr), "dd/MM"),
      enviados: dayStats.reduce((acc, s) => acc + (s.sent_count || 0), 0),
      respostas: dayStats.reduce((acc, s) => acc + (s.reply_count || 0), 0),
      falhas: dayStats.reduce((acc, s) => acc + (s.failed_count || 0), 0),
    };
  });

  const handleTogglePause = (instanceId: string, isPaused: boolean) => {
    togglePauseMutation.mutate({ instanceId, isPaused });
  };

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
    <>
      <Helmet>
        <title>WhatsApp - Atendimento Assistido | Enove</title>
      </Helmet>
      <AdminLayout
        activeTab="whatsapp"
        onTabChange={(tab) => {
          if (tab === "whatsapp") return;
          navigate("/admin");
        }}
        onLogout={handleLogout}
        searchTerm=""
        onSearchChange={() => {}}
        brokers={[]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Smartphone className="w-7 h-7" />
                WhatsApp - Atendimento Assistido
              </h1>
              <p className="text-slate-400 mt-1">
                Gerencie conexões e dispare mensagens automatizadas
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchInstances()}
              disabled={isLoadingInstances}
              className="border-[#2a2a2e] text-slate-400 hover:bg-[#2a2a2e] hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingInstances ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex bg-[#1a1a1d] border border-[#2a2a2e]">
              <TabsTrigger value="overview" className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Visão Global</span>
              </TabsTrigger>
              <TabsTrigger value="global-connection" className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Conexão Global</span>
              </TabsTrigger>
              <TabsTrigger value="connection" className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white">
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">Conexão</span>
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white">
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger value="queue" className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Fila</span>
              </TabsTrigger>
              <TabsTrigger value="automation" className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white">
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">Automação</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <WhatsAppOverviewTab
                instances={instances}
                isLoadingInstances={isLoadingInstances}
                refetchInstances={refetchInstances}
                globalTotals={globalTotals}
                isLoadingStats={isLoadingStats}
                chartData={chartData}
                optouts={optouts}
                isLoadingOptouts={isLoadingOptouts}
                onTogglePause={handleTogglePause}
              />
            </TabsContent>

            <TabsContent value="global-connection" className="mt-6">
              <GlobalConnectionTab />
            </TabsContent>

            <TabsContent value="connection" className="mt-6">
              <ConnectionTab />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-6">
              <CampaignsTab />
            </TabsContent>

            <TabsContent value="queue" className="mt-6">
              <QueueTab />
            </TabsContent>

            <TabsContent value="automation" className="mt-6">
              <AutoMessageTab />
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <SecurityTab />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminWhatsApp;
