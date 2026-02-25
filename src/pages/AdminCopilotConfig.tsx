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
  Loader2, Wifi, Send, Shield, Megaphone, Bot, Sparkles,
  Eye, Globe, RefreshCw, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalConnectionTab } from "@/components/whatsapp/GlobalConnectionTab";
import { ConnectionTab } from "@/components/whatsapp/ConnectionTab";
import { CampaignsTab } from "@/components/whatsapp/CampaignsTab";
import { QueueTab } from "@/components/whatsapp/QueueTab";
import { SecurityTab } from "@/components/whatsapp/SecurityTab";
import { AutoMessageTab } from "@/components/whatsapp/AutoMessageTab";
import { AdminCopilotOverview } from "@/components/admin/AdminCopilotOverview";
import { WhatsAppOverviewTab } from "@/components/admin/WhatsAppOverviewTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWhatsAppGlobalStats } from "@/hooks/use-whatsapp-stats";
import { useWhatsAppOptouts } from "@/hooks/use-whatsapp-optouts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const TAB_GROUPS = [
  {
    label: "Inteligência",
    tabs: [
      // { id: "copilot", label: "Copiloto", icon: Sparkles }, // temporarily disabled
    ],
  },
  {
    label: "WhatsApp",
    tabs: [
      { id: "overview", label: "Visão Global", icon: Eye },
      { id: "global-connection", label: "Conexão Global", icon: Globe },
      { id: "connection", label: "Conexão", icon: Wifi },
      { id: "campaigns", label: "Campanhas", icon: Megaphone },
      { id: "queue", label: "Fila", icon: Send },
      { id: "automation", label: "Automação", icon: Bot },
      { id: "security", label: "Segurança", icon: Shield },
    ],
  },
];

export default function AdminCopilotConfig() {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("copilot");
  const [_selectedBrokerId, _setSelectedBrokerId] = useState<string | null>(null);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeGroup = TAB_GROUPS.find(g => g.tabs.some(t => t.id === activeTab));
  const activeTabData = activeGroup?.tabs.find(t => t.id === activeTab);

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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
            
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Animated robot avatar */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Bot className="w-7 h-7 text-primary" />
                  </div>
                  {/* Online pulse */}
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card">
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-foreground tracking-tight">
                      Central de Inteligência
                    </h1>
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/20">
                      Pro
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Copiloto IA, automações e gestão de comunicação
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchInstances()}
                disabled={isLoadingInstances}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingInstances && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="rounded-xl border border-border bg-card p-1.5">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                {TAB_GROUPS.map((group, gi) => (
                  <div key={group.label} className="flex items-center gap-1 shrink-0">
                    {gi > 0 && (
                      <div className="w-px h-6 bg-border mr-2" />
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50 px-2 hidden lg:block">
                      {group.label}
                    </span>
                    {group.tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                            isActive
                              ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 px-1">
              <span>{activeGroup?.label}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{activeTabData?.label}</span>
            </div>

            {/* Copilot Tab - temporarily disabled */}

            <TabsContent value="overview" className="mt-4">
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

            <TabsContent value="global-connection" className="mt-4">
              <GlobalConnectionTab />
            </TabsContent>

            <TabsContent value="connection" className="mt-4">
              <ConnectionTab />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-4">
              <CampaignsTab />
            </TabsContent>

            <TabsContent value="queue" className="mt-4">
              <QueueTab />
            </TabsContent>

            <TabsContent value="automation" className="mt-4">
              <AutoMessageTab />
            </TabsContent>

            <TabsContent value="security" className="mt-4">
              <SecurityTab />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
}