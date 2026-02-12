import { Search } from "lucide-react";

interface BrokerHeaderProps {
  brokerName?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function BrokerHeader({
  brokerName,
  searchTerm,
  onSearchChange,
}: BrokerHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#141417]/95 backdrop-blur-sm border-b border-[#2a2a2e]">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-white">Meus Leads</h1>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-6 py-3">
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Corretor</span>
          <span className="text-slate-500">›</span>
          <span className="text-slate-200 font-medium">Meus Leads</span>
          {brokerName && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{brokerName}</span>
            </>
          )}
        </nav>

        {/* Search (optional) */}
        {onSearchChange && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#1e1e22] border border-[#2a2a2e] rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFFF00]/50 focus:border-[#FFFF00]/50 transition-all"
            />
          </div>
        )}
      </div>
    </header>
  );
}
