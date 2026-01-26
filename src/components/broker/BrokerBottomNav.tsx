import { LayoutDashboard, List, Copy, Plus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";

interface BrokerBottomNavProps {
  viewMode: "kanban" | "list";
  onViewChange: (mode: "kanban" | "list") => void;
  onCopyLink?: () => void;
  onAddLead?: () => void;
  onNotificationsClick?: () => void;
}

export function BrokerBottomNav({
  viewMode,
  onViewChange,
  onCopyLink,
  onAddLead,
  onNotificationsClick,
}: BrokerBottomNavProps) {
  const { unreadCount } = useNotifications();

  const navItems: Array<{
    id: string;
    label: string;
    icon: typeof LayoutDashboard;
    isFab?: boolean;
    badge?: number;
  }> = [
    { id: "notifications", label: "Notificações", icon: Bell, badge: unreadCount },
    { id: "kanban", label: "Kanban", icon: LayoutDashboard },
    { id: "add", label: "Adicionar", icon: Plus, isFab: true },
    { id: "list", label: "Lista", icon: List },
    { id: "copy", label: "Link", icon: Copy },
  ] as const;

  const handleClick = (id: string) => {
    if (id === "kanban" || id === "list") {
      onViewChange(id);
    } else if (id === "add" && onAddLead) {
      onAddLead();
    } else if (id === "copy" && onCopyLink) {
      onCopyLink();
    } else if (id === "notifications" && onNotificationsClick) {
      onNotificationsClick();
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

          const isActive = viewMode === item.id;

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
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-md shadow-red-500/50">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              {/* Active indicator dot */}
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
