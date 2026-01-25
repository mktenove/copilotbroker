import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AdminHeaderProps {
  activeTab: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  brokers?: { id: string; name: string; slug: string }[];
}

const TAB_LABELS: Record<string, { title: string; subtitle?: string }> = {
  crm: { title: "CRM", subtitle: "Gerencie seus leads e pipeline de vendas" },
  leads: { title: "Leads", subtitle: "Visualize e exporte todos os leads" },
  brokers: { title: "Corretores", subtitle: "Cadastre e gerencie corretores parceiros" },
  projects: { title: "Empreendimentos", subtitle: "Configure seus empreendimentos ativos" },
  analytics: { title: "Analytics", subtitle: "Acompanhe métricas e performance" },
};

// Mock team members for avatar stack
const TEAM_AVATARS = [
  { id: "1", name: "Ana", color: "from-pink-500 to-rose-500" },
  { id: "2", name: "Bruno", color: "from-blue-500 to-cyan-500" },
  { id: "3", name: "Carlos", color: "from-amber-500 to-orange-500" },
  { id: "4", name: "Diana", color: "from-emerald-500 to-green-500" },
];

export function AdminHeader({ 
  activeTab, 
  searchTerm, 
  onSearchChange,
  brokers = []
}: AdminHeaderProps) {
  const currentTab = TAB_LABELS[activeTab] || TAB_LABELS.crm;
  
  const displayTeam = brokers.length > 0 
    ? brokers.slice(0, 4).map(b => ({ id: b.id, name: b.name, color: "from-slate-500 to-slate-600" }))
    : TEAM_AVATARS;
  
  const extraCount = (brokers.length > 0 ? brokers.length : 5) - 4;

  return (
    <header className="sticky top-0 z-30 bg-[#141417]/95 backdrop-blur-sm border-b border-[#2a2a2e]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-white">{currentTab.title}</h1>
        
        {(activeTab === "crm" || activeTab === "leads") && onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                "w-40 pl-9 pr-3 py-2 rounded-lg text-sm",
                "bg-[#1e1e22] border border-[#2a2a2e]",
                "text-slate-200 placeholder:text-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "transition-all duration-200"
              )}
            />
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        {/* Breadcrumb row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-[#2a2a2e]/50">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <span>Admin</span>
            <span>›</span>
            <span className="text-slate-300">{currentTab.title}</span>
          </nav>
          
          <ThemeToggle />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{currentTab.title}</h1>
              {currentTab.subtitle && (
                <p className="text-sm text-slate-400 mt-0.5">{currentTab.subtitle}</p>
              )}
            </div>

            {/* Team avatars stack */}
            <div className="hidden lg:flex items-center">
              <div className="flex -space-x-2">
                {displayTeam.map((member, idx) => (
                  <Avatar 
                    key={member.id} 
                    className={cn(
                      "w-8 h-8 border-2 border-[#141417] ring-0",
                      "hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                    )}
                    style={{ zIndex: displayTeam.length - idx }}
                  >
                    <AvatarFallback className={cn("text-white text-xs font-medium bg-gradient-to-br", member.color)}>
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {extraCount > 0 && (
                  <div 
                    className={cn(
                      "w-8 h-8 rounded-full border-2 border-[#141417]",
                      "bg-[#2a2a2e] flex items-center justify-center",
                      "text-xs font-medium text-slate-300"
                    )}
                  >
                    +{extraCount}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search - only on CRM/Leads */}
          {(activeTab === "crm" || activeTab === "leads") && onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar leads..."
                value={searchTerm || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className={cn(
                  "w-64 pl-10 pr-4 py-2 rounded-full text-sm",
                  "bg-[#1e1e22] border border-[#2a2a2e]",
                  "text-slate-200 placeholder:text-slate-500",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                  "transition-all duration-200"
                )}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
