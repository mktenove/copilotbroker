import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Building2, Users, Handshake, Receipt, ScrollText, LogOut, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import copilotIcon from "@/assets/copilot-icon.png";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/super-admin" },
  { id: "real-estate", label: "Imobiliárias", icon: Building2, path: "/super-admin/tenants/real-estate" },
  { id: "brokers", label: "Brokers", icon: Users, path: "/super-admin/brokers" },
  { id: "affiliates", label: "Afiliados", icon: Handshake, path: "/super-admin/affiliates" },
  { id: "billing", label: "Billing / Webhooks", icon: Receipt, path: "/super-admin/billing" },
  { id: "billing-events", label: "Billing Events", icon: ScrollText, path: "/super-admin/billing-events" },
  { id: "audit", label: "Auditoria", icon: ScrollText, path: "/super-admin/audit" },
];

const BREADCRUMB_MAP: Record<string, { title: string; subtitle?: string }> = {
  "/super-admin": { title: "Dashboard", subtitle: "Visão geral da plataforma" },
  "/super-admin/tenants/real-estate": { title: "Imobiliárias", subtitle: "Gestão de tenants imobiliária" },
  "/super-admin/tenants/real-estate/new": { title: "Nova Imobiliária", subtitle: "Cadastro de tenant" },
  "/super-admin/tenants/real-estate/invites": { title: "Convites — Imobiliárias", subtitle: "Gerenciar convites" },
  "/super-admin/brokers": { title: "Brokers", subtitle: "Gestão de corretores autônomos" },
  "/super-admin/brokers/new": { title: "Adicionar Broker", subtitle: "Cadastro de broker" },
  "/super-admin/brokers/invites": { title: "Convites — Brokers", subtitle: "Gerenciar convites" },
  "/super-admin/affiliates": { title: "Afiliados", subtitle: "Em breve" },
  "/super-admin/billing": { title: "Billing / Webhooks", subtitle: "Eventos do Stripe" },
  "/super-admin/billing-events": { title: "Billing Events", subtitle: "Debug de webhooks" },
  "/super-admin/audit": { title: "Auditoria", subtitle: "Logs de ações administrativas" },
};

export default function SuperAdminLayout() {
  const { role, isLoading } = useUserRole();
  const [userInitial, setUserInitial] = useState("S");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchInitial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserInitial(user.email.charAt(0).toUpperCase());
    };
    fetchInitial();
  }, []);

  const isActive = (path: string) => {
    if (path === "/super-admin") return location.pathname === "/super-admin";
    return location.pathname.startsWith(path);
  };

  const currentBreadcrumb = BREADCRUMB_MAP[location.pathname] || { title: "Super Admin" };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <RefreshCw className="w-12 h-12 animate-spin text-[#FFFF00]" />
      </div>
    );
  }

  if (role !== "admin") {
    return <Navigate to="/auth" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen bg-[#0f0f12] flex">
        {/* Sidebar — icon-only, w-16, fixed */}
        <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col w-16 bg-[#141417] border-r border-[#2a2a2e]">
          {/* Logo */}
          <div className="flex items-center justify-center pt-4 pb-3">
            <img src={copilotIcon} alt="Copilot" className="h-6 w-6 object-contain" />
          </div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col items-center gap-1 py-4">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                        active
                          ? "bg-[#FFFF00]/15 text-[#FFFF00]"
                          : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#FFFF00]" />
                      )}
                      <Icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-white text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="flex flex-col items-center gap-2 py-4 border-t border-[#2a2a2e]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-red-500/50 transition-colors"
                >
                  <Avatar className="w-full h-full">
                    <AvatarFallback className="bg-[#FFFF00]/10 text-[#FFFF00] text-sm font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-white text-xs">
                Sair
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 ml-16 min-h-screen flex flex-col">
          {/* Sticky header with breadcrumb */}
          <header className="sticky top-0 z-30 bg-[#141417]/95 backdrop-blur-sm border-b border-[#2a2a2e]">
            <div className="flex items-center justify-between px-6 py-3">
              <nav className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 font-mono text-xs tracking-wider">CONTROL TOWER</span>
                <span className="text-slate-600">›</span>
                <span className="text-white font-medium">{currentBreadcrumb.title}</span>
                {currentBreadcrumb.subtitle && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500 text-xs">{currentBreadcrumb.subtitle}</span>
                  </>
                )}
              </nav>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
