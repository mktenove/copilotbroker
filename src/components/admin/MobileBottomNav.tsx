import { LayoutDashboard, Users, Building2, BarChart3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddLead?: () => void;
}

const NAV_ITEMS = [
  { id: "crm", label: "CRM", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "add", label: "Adicionar", icon: Plus, isFab: true },
  { id: "brokers", label: "Corretores", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function MobileBottomNav({ activeTab, onTabChange, onAddLead }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-[#141417]/95 backdrop-blur-lg border-t border-[#2a2a2e]" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-2 py-2 pb-safe">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          
          // FAB button (center)
          if (item.isFab) {
            return (
              <button
                key={item.id}
                onClick={onAddLead}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-14 h-14 -mt-6 rounded-full",
                  "bg-emerald-500 hover:bg-emerald-400",
                  "text-white shadow-lg shadow-emerald-500/30",
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
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[60px]",
                "transition-colors duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-slate-500 active:text-slate-300"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
