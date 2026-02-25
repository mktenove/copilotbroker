import { useState } from "react";
import { LayoutDashboard, Plus, Bell, MessageSquare, MoreHorizontal, List, Building2, LogOut, RotateCw, Inbox, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { useInboxUnread } from "@/hooks/use-inbox-unread";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface BrokerBottomNavProps {
  viewMode: "kanban" | "list";
  onViewChange: (mode: "kanban" | "list") => void;
  onCopyLink?: () => void;
  onAddLead?: () => void;
  onNotificationsClick?: () => void;
  isLeader?: boolean;
}

export function BrokerBottomNav({
  viewMode,
  onViewChange,
  onCopyLink,
  onAddLead,
  onNotificationsClick,
  isLeader = false,
}: BrokerBottomNavProps) {
  const { unreadCount } = useNotifications();
  const { unreadCount: inboxUnread } = useInboxUnread();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isCopilotActive = location.pathname === "/corretor/copiloto";
  const isInboxActive = location.pathname === "/corretor/inbox";

  const navItems: Array<{
    id: string;
    icon: typeof LayoutDashboard;
    isFab?: boolean;
    badge?: number;
  }> = [
    // { id: "inbox", icon: Inbox, badge: inboxUnread }, // temporarily disabled
    { id: "kanban", icon: LayoutDashboard },
    { id: "add", icon: Plus, isFab: true },
    { id: "copilot", icon: Bot },
    { id: "more", icon: MoreHorizontal },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  const handleClick = (id: string) => {
    if (id === "kanban") {
      onViewChange("kanban");
    } else if (id === "add") {
      onAddLead?.();
    } else if (id === "inbox") {
      navigate("/corretor/inbox");
    } else if (id === "copilot") {
      navigate("/corretor/copiloto");
    } else if (id === "more") {
      setIsMoreOpen(true);
    }
  };

  const handleMoreAction = (action: string) => {
    setIsMoreOpen(false);
    if (action === "list") {
      onViewChange("list");
    } else if (action === "projects") {
      navigate("/corretor/empreendimentos");
    } else if (action === "roletas") {
      navigate("/corretor/roletas");
    } else if (action === "copilot") {
      navigate("/corretor/copiloto");
    } else if (action === "notifications") {
      onNotificationsClick?.();
    } else if (action === "logout") {
      handleLogout();
    }
  };

  const getItemColor = (id: string) => {
    if (id === "kanban" && viewMode === "kanban" && !isCopilotActive && !isInboxActive) {
      return "text-[#FFFF00]";
    }
    if (id === "copilot" && isCopilotActive) {
      return "text-blue-400";
    }
    if (id === "inbox" && isInboxActive) {
      return "text-[#FFFF00]";
    }
    return "text-slate-500 active:text-slate-300";
  };

  const getActiveIndicator = (id: string) => {
    if (id === "kanban" && viewMode === "kanban" && !isCopilotActive) return true;
    if (id === "copilot" && isCopilotActive) return true;
    return false;
  };

  const moreMenuItems = [
    { id: "list", label: "Modo Lista", icon: List, description: "Alternar para visualização em lista" },
    { id: "notifications", label: "Notificações", icon: Bell, description: "Ver notificações", badge: unreadCount },
    ...(isLeader ? [{ id: "roletas", label: "Roletas", icon: RotateCw, description: "Gerenciar roletas da equipe" }] : []),
    { id: "projects", label: "Empreendimentos", icon: Building2, description: "Ver seus empreendimentos" },
    { id: "logout", label: "Sair", icon: LogOut, description: "Encerrar sessão", destructive: true },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Background with blur */}
        <div className="absolute inset-0 bg-[#141417]/95 backdrop-blur-lg border-t border-[#2a2a2e]" />

        {/* Safe area padding for iOS */}
        <div className="relative flex items-center justify-around px-2 py-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;

            // FAB button (center)
            if (item.isFab) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={cn(
                    "relative flex items-center justify-center",
                    "w-14 h-14 -mt-6 rounded-full",
                    "bg-[#FFFF00] hover:brightness-110",
                    "text-black shadow-lg shadow-[hsl(60_100%_50%/0.3)]",
                    "transition-all duration-200 active:scale-95"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={cn(
                  "flex items-center justify-center p-3 min-w-[48px]",
                  "transition-colors duration-200 relative",
                  getItemColor(item.id)
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {/* Facebook-style notification badge */}
                  {(item.badge ?? 0) > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-md shadow-red-500/50">
                      {item.badge! > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>

                {/* Active indicator dot */}
                {getActiveIndicator(item.id) && (
                  <div className={cn(
                    "absolute bottom-1.5 w-1 h-1 rounded-full",
                    item.id === "copilot" ? "bg-blue-400" : "bg-[#FFFF00]"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* More menu Sheet */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="bg-[#1e1e22] border-[#2a2a2e] rounded-t-2xl px-4 pb-8">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-slate-200 text-base">Mais opções</SheetTitle>
          </SheetHeader>

          <div className="space-y-1 mt-2">
            {moreMenuItems.map((menuItem) => {
              const MenuIcon = menuItem.icon;
              return (
                <button
                  key={menuItem.id}
                  onClick={() => handleMoreAction(menuItem.id)}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-4 rounded-xl",
                    "transition-colors duration-150",
                    menuItem.destructive
                      ? "text-red-400 hover:bg-red-500/10 active:bg-red-500/20"
                      : "text-slate-200 hover:bg-[#2a2a2e] active:bg-[#333338]"
                  )}
                >
                  <MenuIcon className="w-5 h-5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{menuItem.label}</p>
                    <p className={cn(
                      "text-xs mt-0.5",
                      menuItem.destructive ? "text-red-400/60" : "text-slate-500"
                    )}>
                      {menuItem.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
