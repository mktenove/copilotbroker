import { LayoutDashboard, List, Copy, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrokerBottomNavProps {
  viewMode: "kanban" | "list";
  onViewChange: (mode: "kanban" | "list") => void;
  onCopyLink?: () => void;
  onLogout: () => void;
}

export function BrokerBottomNav({
  viewMode,
  onViewChange,
  onCopyLink,
  onLogout,
}: BrokerBottomNavProps) {
  const navItems: Array<{
    id: string;
    label: string;
    icon: typeof LayoutDashboard;
    isFab?: boolean;
    disabled?: boolean;
  }> = [
    { id: "kanban", label: "Kanban", icon: LayoutDashboard },
    { id: "list", label: "Lista", icon: List },
    { id: "copy", label: "Copiar", icon: Copy, isFab: true },
    { id: "stats", label: "Stats", icon: BarChart3, disabled: true },
    { id: "logout", label: "Sair", icon: LogOut },
  ] as const;

  const handleClick = (id: string) => {
    if (id === "kanban" || id === "list") {
      onViewChange(id);
    } else if (id === "copy" && onCopyLink) {
      onCopyLink();
    } else if (id === "logout") {
      onLogout();
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
          const isDisabled = item.disabled;

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && handleClick(item.id)}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[60px]",
                "transition-colors duration-200 relative",
                isDisabled && "opacity-40 cursor-not-allowed",
                isActive
                  ? "text-[#FFFF00]"
                  : item.id === "logout"
                  ? "text-slate-500 active:text-red-400"
                  : "text-slate-500 active:text-slate-300"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>

              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#FFFF00]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
