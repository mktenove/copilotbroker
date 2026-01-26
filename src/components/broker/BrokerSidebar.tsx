import { LogOut, LayoutDashboard, List, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import logoEnoveMini from "@/assets/logo-enove-mini.png";

interface BrokerSidebarProps {
  viewMode: "kanban" | "list";
  onViewChange: (mode: "kanban" | "list") => void;
  onLogout: () => void;
  onOpenLanding?: () => void;
  brokerInitial?: string;
}

const NAV_ITEMS = [
  { id: "kanban", label: "Kanban", icon: LayoutDashboard },
  { id: "list", label: "Lista", icon: List },
] as const;

export function BrokerSidebar({
  viewMode,
  onViewChange,
  onLogout,
  onOpenLanding,
  brokerInitial = "C",
}: BrokerSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 hidden md:flex flex-col bg-[#141417] border-r border-[#2a2a2e]">
      {/* Logo */}
      <div className="flex items-center justify-center pt-4 pb-3">
        <img src={logoEnoveMini} alt="Enove" className="h-8 w-8 object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = viewMode === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                "hover:bg-[#2a2a2e] group relative",
                isActive
                  ? "bg-[#2a2a2e] text-[#FFFF00]"
                  : "text-slate-400 hover:text-white"
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-[#2a2a2e] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Open Landing Page */}
        {onOpenLanding && (
          <button
            onClick={onOpenLanding}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-[#2a2a2e] text-slate-400 hover:text-white group relative mt-2"
            title="Abrir Landing Page"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[#2a2a2e] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Abrir Landing
            </span>
          </button>
        )}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-3 px-2 py-4 border-t border-[#2a2a2e]">
        {/* Broker Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#FFFF00]/10 border border-[#FFFF00]/30 flex items-center justify-center">
          <span className="text-[#FFFF00] text-sm font-medium">{brokerInitial}</span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-red-500/10 text-slate-400 hover:text-red-400 group relative"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#2a2a2e] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}
