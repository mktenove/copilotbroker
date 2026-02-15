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
    <header className="sticky top-0 z-30 bg-[#141417]/95 backdrop-blur-sm border-b border-[#2a2a2e] pt-safe">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-white">{currentTab.title}</h1>
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
      </div>
    </header>
  );
}
