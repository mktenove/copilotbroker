import { useState } from "react";
import { 
  LayoutDashboard, Users, Brain, Plus, Bell, LogOut, 
  MoreHorizontal, Building2, Shuffle, Settings, MessageCircle, Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { useInboxUnread } from "@/hooks/use-inbox-unread";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SettingsPanel } from "./SettingsPanel";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddLead?: () => void;
  onNotificationsClick?: () => void;
}

const DRAWER_ITEMS_STATIC = [
  { id: "inbox", label: "Inbox", icon: MessageCircle },
  { id: "brokers", label: "Corretores", icon: Users },
  { id: "roletas", label: "Roletas", icon: Shuffle },
  { id: "projects", label: "Empreendimentos", icon: Building2 },
  { id: "copilot", label: "Copiloto IA", icon: Bot },
  { id: "analytics", label: "Inteligência", icon: Brain },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function MobileBottomNav({ 
  activeTab, 
  onTabChange, 
  onAddLead,
  onNotificationsClick 
}: MobileBottomNavProps) {
  const { unreadCount } = useNotifications();
  const { unreadCount: inboxUnread } = useInboxUnread();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const DRAWER_ITEMS = DRAWER_ITEMS_STATIC.map(item =>
    item.id === "inbox" ? { ...item, badge: inboxUnread } : item
  );

  const navItems = [
    { id: "notifications", icon: Bell, badge: unreadCount },
    { id: "crm", icon: LayoutDashboard },
    { id: "add", icon: Plus, isFab: true },
    { id: "leads", icon: Users },
    { id: "more", icon: MoreHorizontal },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  const handleClick = (id: string) => {
    if (id === "notifications" && onNotificationsClick) {
      onNotificationsClick();
    } else if (id === "add") {
      onAddLead?.();
    } else if (id === "more") {
      setIsMoreOpen(true);
    } else {
      onTabChange(id);
    }
  };

  const handleDrawerItemClick = (id: string) => {
    setIsMoreOpen(false);
    if (id === "inbox") {
      navigate("/admin/inbox");
    } else if (id === "copilot") {
      navigate("/admin/copiloto");
    } else if (id === "settings") {
      setIsSettingsOpen(true);
    } else {
      onTabChange(id);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="absolute inset-0 bg-[#141417]/95 backdrop-blur-lg border-t border-[#2a2a2e]" />
        <div className="relative flex items-center justify-around px-2 py-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            
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
            
            const isActive = activeTab === item.id;
          
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={cn(
                  "flex items-center justify-center p-3 min-w-[48px]",
                  "transition-colors duration-200 relative",
                  isActive 
                    ? "text-[#FFFF00]" 
                    : "text-slate-500 active:text-slate-300"
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {(item.badge ?? 0) > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-md shadow-red-500/50">
                      {item.badge! > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#FFFF00]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drawer "Mais" */}
      <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DrawerContent className="bg-[#141417] border-[#2a2a2e]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-white text-lg">Menu</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 flex flex-col gap-1">
            {DRAWER_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleDrawerItemClick(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    isActive
                      ? item.id === "inbox" ? "bg-[hsl(145,80%,42%)]/20 text-[hsl(145,80%,55%)] shadow-[0_0_12px_hsl(145,80%,42%,0.3)]" : "bg-primary/20 text-primary"
                      : item.id === "inbox"
                        ? "text-[hsl(145,80%,55%)]/70 active:bg-[hsl(145,80%,42%)]/10"
                        : "text-muted-foreground active:bg-card"
                  )}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {(item as any).badge > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                        {(item as any).badge > 99 ? "99+" : (item as any).badge}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}

            <div className="border-t border-[#2a2a2e] my-2" />

            <button
              onClick={() => { setIsMoreOpen(false); handleLogout(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 active:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
