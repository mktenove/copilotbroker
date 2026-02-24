import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CopilotConfigPage } from "@/components/inbox/CopilotConfigPage";
import { BrokerSidebar } from "@/components/broker/BrokerSidebar";
import { BrokerBottomNav } from "@/components/broker/BrokerBottomNav";

export default function BrokerCopilotConfig() {
  const navigate = useNavigate();
  const [brokerId, setBrokerId] = useState<string | null>(null);

  useEffect(() => {
    const getBrokerId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      const { data } = await supabase
        .from("brokers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setBrokerId((data as any).id);
    };
    getBrokerId();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!brokerId) {
    return (
      <div className="min-h-screen bg-[#141417] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141417]">
      <BrokerSidebar viewMode="kanban" onViewChange={() => navigate("/corretor/admin")} onLogout={handleLogout} />
      <div className="lg:pl-16">
        <CopilotConfigPage brokerId={brokerId} />
      </div>
      <BrokerBottomNav viewMode="kanban" onViewChange={() => navigate("/corretor/admin")} />
    </div>
  );
}
