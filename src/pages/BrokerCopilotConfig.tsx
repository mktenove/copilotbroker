import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrokerSidebar } from "@/components/broker/BrokerSidebar";
import { BrokerBottomNav } from "@/components/broker/BrokerBottomNav";
import { Loader2, Wifi, Send, Shield, Megaphone, Bot, Sparkles } from "lucide-react";
import { ConnectionTab } from "@/components/whatsapp/ConnectionTab";
import { CampaignsTab } from "@/components/whatsapp/CampaignsTab";
import { QueueTab } from "@/components/whatsapp/QueueTab";
import { SecurityTab } from "@/components/whatsapp/SecurityTab";
import { AutoMessageTab } from "@/components/whatsapp/AutoMessageTab";
import { CopilotConfigPage } from "@/components/inbox/CopilotConfigPage";

export default function BrokerCopilotConfig() {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading, brokerId } = useUserRole();
  const [brokerName, setBrokerName] = useState("");
  const [activeTab, setActiveTab] = useState("connection");

  useEffect(() => {
    if (!roleLoading && role !== "broker" && role !== "admin") {
      navigate("/auth");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    const fetchBrokerInfo = async () => {
      if (!brokerId) return;
      const { data } = await supabase
        .from("brokers")
        .select("name")
        .eq("id", brokerId)
        .single();
      if (data) setBrokerName(data.name);
    };
    fetchBrokerInfo();
  }, [brokerId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      <BrokerSidebar
        viewMode="kanban"
        onViewChange={() => navigate("/corretor/admin")}
        onLogout={handleLogout}
        brokerInitial={brokerName?.charAt(0) || "C"}
      />

      <main className="md:ml-16 pb-20 md:pb-0">
        <header className="sticky top-0 z-30 bg-[#0d0d0f]/95 backdrop-blur-sm border-b border-[#2a2a2e] px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              Copiloto IA
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Configure sua conexão, assistente de vendas e automações
            </p>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#1a1a1d] border border-[#2a2a2e] w-full justify-start overflow-x-auto">
              <TabsTrigger
                value="connection"
                className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">Conexão</span>
              </TabsTrigger>
              <TabsTrigger
                value="copilot"
                className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Copiloto</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
              <TabsTrigger
                value="automation"
                className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">Automação</span>
              </TabsTrigger>
              <TabsTrigger
                value="campaigns"
                className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
              >
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger
                value="queue"
                className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Fila</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connection" className="mt-6">
              <ConnectionTab />
            </TabsContent>

            <TabsContent value="copilot" className="mt-6">
              {brokerId ? (
                <CopilotConfigPage brokerId={brokerId} />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <SecurityTab />
            </TabsContent>

            <TabsContent value="automation" className="mt-6">
              <AutoMessageTab />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-6">
              <CampaignsTab />
            </TabsContent>

            <TabsContent value="queue" className="mt-6">
              <QueueTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BrokerBottomNav
        viewMode="kanban"
        onViewChange={() => navigate("/corretor/admin")}
      />
    </div>
  );
}
