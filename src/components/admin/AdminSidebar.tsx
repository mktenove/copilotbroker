import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Brain, 
  Settings,
  Plus,
  Shuffle,
  MessageCircle,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoEnove from "@/assets/logo-enove-mini.png";
import { useInboxUnread } from "@/hooks/use-inbox-unread";
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
  { id: "inbox", label: "Inbox", icon: MessageCircle },
  { id: "brokers", label: "Corretores", icon: Users },
  { id: "roletas", label: "Roletas", icon: Shuffle },
  { id: "projects", label: "Empreendimentos", icon: Building2 },
  { id: "copilot", label: "Copiloto IA", icon: Bot },
  { id: "analytics", label: "Inteligência", icon: Brain },
];

export function AdminSidebar({ activeTab, onTabChange, onLogout, onAddLead }: AdminSidebarProps) {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("A");
  const { unreadCount: inboxUnread } = useInboxUnread();

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
        {/* Logo area - aligned with header breadcrumb row */}
        <div className="flex items-center justify-center pt-4 pb-3">
          <img 
            src={logoEnove} 
            alt="Enove" 
            className="h-6 w-6 object-contain"
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
            <TooltipContent side="right" className="bg-card border-border text-foreground">
              Adicionar Lead
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const isInbox = item.id === "inbox";
            
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (item.id === "inbox") {
                        navigate("/admin/inbox");
                      } else if (item.id === "copilot") {
                        navigate("/admin/copiloto");
                      } else {
                        onTabChange(item.id);
                      }
                    }}
                    className={cn(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                      isInbox
                        ? isActive
                          ? "bg-green-500/20 text-green-400"
                          : "text-green-400/60 hover:text-green-400 hover:bg-green-500/10"
                        : isActive 
                          ? "bg-primary/20 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
                        isInbox ? "bg-green-400" : "bg-primary"
                      )} />
                    )}
                    <Icon className="w-5 h-5" />
                    {item.id === "inbox" && inboxUnread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-md shadow-red-500/50">
                        {inboxUnread > 99 ? "99+" : inboxUnread}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-card border-border text-foreground">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-2 py-4 border-t border-[#2a2a2e]">
          {/* Notifications */}
          <NotificationPanel />

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border text-foreground">
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
            <TooltipContent side="right" className="bg-card border-border text-foreground">
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
