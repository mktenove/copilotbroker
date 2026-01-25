import { Search, Plus, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  activeTab: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onAddLead?: () => void;
}

const TAB_LABELS: Record<string, string> = {
  crm: "CRM",
  leads: "Leads",
  brokers: "Corretores",
  projects: "Empreendimentos",
  analytics: "Analytics",
};

export function AdminHeader({ activeTab, searchTerm, onSearchChange, onAddLead }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
      {/* Sidebar Trigger */}
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground font-medium">Admin</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        <span className="font-semibold text-foreground">{TAB_LABELS[activeTab] || activeTab}</span>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search Bar - only on CRM/Leads */}
      {(activeTab === "crm" || activeTab === "leads") && onSearchChange && (
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={searchTerm || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "w-64 pl-9 pr-4 py-2 rounded-full text-sm",
              "bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
              "transition-all"
            )}
          />
        </div>
      )}

      {/* Add Lead Button */}
      {onAddLead && (
        <Button
          onClick={onAddLead}
          size="sm"
          className="gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Lead</span>
        </Button>
      )}

      {/* Theme Toggle */}
      <ThemeToggle />
    </header>
  );
}
