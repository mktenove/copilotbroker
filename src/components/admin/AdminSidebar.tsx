import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  BarChart3, 
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoEnove from "@/assets/logo-enove-mini.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationPanel } from "./NotificationPanel";
import { SettingsPanel } from "./SettingsPanel";
import { supabase } from "@/integrations/supabase/client";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onAddLead?: () => void;
}

const NAV_ITEMS = [
  { id: "crm", label: "CRM", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "brokers", label: "Corretores", icon: Users },
  { id: "projects", label: "Empreendimentos", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminSidebar({ activeTab, onTabChange, onLogout, onAddLead }: AdminSidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("A");

  // Fetch user initial
  useEffect(() => {
    const fetchUserInitial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserInitial(user.email.charAt(0).toUpperCase());
      }
    };
    fetchUserInitial();
  }, []);
  return (
    <TooltipProvider delayDuration={100}>
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col w-16 bg-[#141417] border-r border-[#2a2a2e]">
        {/* Logo area */}
        <div className="flex items-center justify-center h-12 border-b border-[#2a2a2e]">
          <img 
            src={logoEnove} 
            alt="Enove" 
            className="h-7 w-7 object-contain"
          />
        </div>

        {/* FAB - Floating Action Button */}
        <div className="flex items-center justify-center py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onAddLead}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  "bg-enove-yellow hover:brightness-110 text-black",
                  "shadow-lg shadow-[hsl(60_100%_50%/0.3)] hover:shadow-[hsl(60_100%_50%/0.5)]",
                  "transition-all duration-200 hover:scale-105"
                )}
              >
                <Plus className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200">
              Adicionar Lead
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                      isActive 
                        ? "bg-primary/20 text-primary" 
                        : "text-slate-500 hover:text-slate-300 hover:bg-[#1e1e22]"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                    )}
                    <Icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-2 py-4 border-t border-[#2a2a2e]">
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <NotificationPanel />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200">
              Notificações
            </TooltipContent>
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1e1e22] transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200">
              Configurações
            </TooltipContent>
          </Tooltip>

          {/* User Avatar / Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={onLogout}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-primary/50 transition-colors"
              >
                <Avatar className="w-full h-full">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200">
              Sair
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Settings Panel */}
        <SettingsPanel 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </aside>
    </TooltipProvider>
  );
}
