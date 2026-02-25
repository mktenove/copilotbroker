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
  Loader2, Wifi, Send, Shield, Megaphone, Bot, Sparkles, Users,
  Eye, Globe, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalConnectionTab } from "@/components/whatsapp/GlobalConnectionTab";
import { ConnectionTab } from "@/components/whatsapp/ConnectionTab";
import { CampaignsTab } from "@/components/whatsapp/CampaignsTab";
import { QueueTab } from "@/components/whatsapp/QueueTab";
import { SecurityTab } from "@/components/whatsapp/SecurityTab";
import { AutoMessageTab } from "@/components/whatsapp/AutoMessageTab";
import { CopilotConfigPage } from "@/components/inbox/CopilotConfigPage";
import { WhatsAppOverviewTab } from "@/components/admin/WhatsAppOverviewTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useWhatsAppGlobalStats } from "@/hooks/use-whatsapp-stats";
import { useWhatsAppOptouts } from "@/hooks/use-whatsapp-optouts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function AdminCopilotConfig() {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("copilot");
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && role !== "admin") {
      navigate("/auth");
    }
  }, [role, roleLoading, navigate]);

  const { data: brokers = [] } = useQuery({
    queryKey: ["admin-copilot-brokers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brokers")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: role === "admin",
  });

  // WhatsApp instances
  const { data: instances = [], isLoading: isLoadingInstances, refetch: refetchInstances } = useQuery({
    queryKey: ["admin-whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broker_whatsapp_instances")
        .select(`*, broker:brokers(id, name, email)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BrokerInstance[];
    },
    enabled: role === "admin",
  });

  const { allStats, globalTotals, isLoading: isLoadingStats } = useWhatsAppGlobalStats();
  const { optouts, isLoading: isLoadingOptouts } = useWhatsAppOptouts();

  const togglePauseMutation = useMutation({
    mutationFn: async ({ instanceId, isPaused }: { instanceId: string; isPaused: boolean }) => {
      const { error } = await supabase
        .from("broker_whatsapp_instances")
        .update({ is_paused: isPaused, pause_reason: isPaused ? "Pausado pelo admin" : null })
        .eq("id", instanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Instância atualizada");
      queryClient.invalidateQueries({ queryKey: ["admin-whatsapp-instances"] });
    },
    onError: (error: Error) => toast.error("Erro: " + error.message),
  });

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Copiloto IA & WhatsApp | Enove</title>
      </Helmet>
      <AdminLayout
        activeTab="copilot"
        onTabChange={(tab) => {
          if (tab === "copilot") return;
          navigate("/admin");
        }}
        onLogout={handleLogout}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Copiloto IA & WhatsApp</h1>
                <p className="text-xs text-slate-400">Assistente IA, conexões e automações</p>
              </div>
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#1a1a1d] border border-[#2a2a2e] w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger value="copilot" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Copiloto</span>
              </TabsTrigger>
              <TabsTrigger value="overview" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Visão Global</span>
              </TabsTrigger>
              <TabsTrigger value="global-connection" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Conexão Global</span>
              </TabsTrigger>
              <TabsTrigger value="connection" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">Conexão</span>
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Fila</span>
              </TabsTrigger>
              <TabsTrigger value="automation" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">Automação</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="copilot" className="mt-6">
              <div className="mb-6 max-w-sm">
                <Label className="text-xs text-slate-400 mb-2 block">Selecione o corretor</Label>
                <Select value={selectedBrokerId || ""} onValueChange={setSelectedBrokerId}>
                  <SelectTrigger className="bg-[#1a1a1e] border-[#2a2a2e] text-white">
                    <SelectValue placeholder="Escolha um corretor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brokers.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBrokerId ? (
                <CopilotConfigPage brokerId={selectedBrokerId} key={selectedBrokerId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Users className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm">Selecione um corretor para configurar o Copiloto IA</p>
                </div>
              )}
            </TabsContent>

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
                onTogglePause={(id, paused) => togglePauseMutation.mutate({ instanceId: id, isPaused: paused })}
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
}
