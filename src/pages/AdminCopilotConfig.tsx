import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Loader2, Wifi, Send, Shield, Megaphone, Bot, Sparkles, Users } from "lucide-react";
import { GlobalConnectionTab } from "@/components/whatsapp/GlobalConnectionTab";
import { CampaignsTab } from "@/components/whatsapp/CampaignsTab";
import { QueueTab } from "@/components/whatsapp/QueueTab";
import { SecurityTab } from "@/components/whatsapp/SecurityTab";
import { AutoMessageTab } from "@/components/whatsapp/AutoMessageTab";
import { CopilotConfigPage } from "@/components/inbox/CopilotConfigPage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

export default function AdminCopilotConfig() {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading } = useUserRole();
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
    <AdminLayout
      activeTab="copilot"
      onTabChange={(tab) => {
        if (tab === "copilot") return;
        navigate("/admin");
        // Let the Admin page handle the tab
      }}
      onLogout={handleLogout}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Copiloto IA</h1>
            <p className="text-xs text-slate-400">Configure o assistente IA dos corretores</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#1a1a1d] border border-[#2a2a2e] w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger
              value="copilot"
              className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Copiloto</span>
            </TabsTrigger>
            <TabsTrigger
              value="global-connection"
              className="text-slate-400 data-[state=active]:bg-[#2a2a2e] data-[state=active]:text-white hover:text-white flex items-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              <span className="hidden sm:inline">Conexão Global</span>
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
          </TabsList>

          <TabsContent value="copilot" className="mt-6">
            {/* Broker selector */}
            <div className="mb-6 max-w-sm">
              <Label className="text-xs text-slate-400 mb-2 block">Selecione o corretor</Label>
              <Select value={selectedBrokerId || ""} onValueChange={setSelectedBrokerId}>
                <SelectTrigger className="bg-[#1a1a1e] border-[#2a2a2e] text-white">
                  <SelectValue placeholder="Escolha um corretor..." />
                </SelectTrigger>
                <SelectContent>
                  {brokers.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
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

          <TabsContent value="global-connection" className="mt-6">
            <GlobalConnectionTab />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecurityTab />
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <AutoMessageTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
