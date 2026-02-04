import { LayoutDashboard, Users, BarChart3, Plus, Bell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddLead?: () => void;
  onNotificationsClick?: () => void;
}

export function MobileBottomNav({ 
  activeTab, 
  onTabChange, 
  onAddLead,
  onNotificationsClick 
}: MobileBottomNavProps) {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const navItems = [
    { id: "notifications", icon: Bell, badge: unreadCount },
    { id: "crm", icon: LayoutDashboard },
    { id: "add", icon: Plus, isFab: true },
    { id: "leads", icon: Users },
    { id: "logout", icon: LogOut },
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
    } else if (id === "logout") {
      handleLogout();
    } else {
      onTabChange(id);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
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
              {/* Facebook-style notification badge */}
              {(item.badge ?? 0) > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-md shadow-red-500/50">
                  {item.badge > 99 ? "99+" : item.badge}
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
  );
}
