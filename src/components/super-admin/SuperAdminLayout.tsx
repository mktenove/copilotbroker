import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Building2, Users, Handshake, Receipt, ScrollText, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import copilotIcon from "@/assets/copilot-icon.png";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/super-admin" },
  { id: "real-estate", label: "Imobiliárias", icon: Building2, path: "/super-admin/tenants/real-estate" },
  { id: "brokers", label: "Brokers", icon: Users, path: "/super-admin/brokers" },
  { id: "affiliates", label: "Afiliados", icon: Handshake, path: "/super-admin/affiliates" },
  { id: "billing", label: "Billing / Webhooks", icon: Receipt, path: "/super-admin/billing" },
  { id: "billing-events", label: "Billing Events", icon: ScrollText, path: "/super-admin/billing-events" },
  { id: "audit", label: "Auditoria", icon: ScrollText, path: "/super-admin/audit" },
];

export default function SuperAdminLayout() {
  const { role, isLoading } = useUserRole();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/super-admin") return location.pathname === "/super-admin";
    return location.pathname.startsWith(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <RefreshCw className="w-12 h-12 animate-spin text-[#FFFF00]" />
      </div>
    );
  }

  // Only super admins (role === 'admin') can access
  if (role !== "admin") {
    return <Navigate to="/auth" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen bg-[#0a0a0c] flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-[#2a2a2e] bg-[#0f0f12] transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-4">
            <img src={copilotIcon} alt="Copilot" className="h-7 w-7 flex-shrink-0" />
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white leading-tight truncate">COPILOT BROKER</p>
                <p className="text-[10px] text-[#FFFF00]/60 font-mono tracking-wider">CONTROL TOWER</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              const btn = (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg transition-all text-sm font-medium",
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                    active
                      ? "bg-[#FFFF00]/10 text-[#FFFF00]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );

              return collapsed ? (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-white">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : btn;
            })}
          </nav>

          {/* Bottom */}
          <div className="px-2 pb-4 space-y-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 py-2 rounded-lg hover:bg-white/5 transition-colors text-xs"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Recolher</span></>}
            </button>
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm",
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              )}
            >
              <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className={cn(
          "flex-1 transition-all duration-200",
          collapsed ? "ml-16" : "ml-56"
        )}>
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
