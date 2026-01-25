import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function AdminHeader({ 
  activeTab, 
  searchTerm, 
  onSearchChange,
}: AdminHeaderProps) {
  const currentTab = TAB_LABELS[activeTab] || TAB_LABELS.crm;

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
      <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-[#2a2a2e]">
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Admin</span>
          <span className="text-slate-500">›</span>
          <span className="text-slate-200 font-medium">{currentTab.title}</span>
          {currentTab.subtitle && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{currentTab.subtitle}</span>
            </>
          )}
        </nav>

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
    </header>
  );
}
