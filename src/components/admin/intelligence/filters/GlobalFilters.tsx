import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { IntelligenceFilters } from "../hooks/useIntelligenceData";

interface GlobalFiltersProps {
  filters: IntelligenceFilters;
  onChange: (filters: IntelligenceFilters) => void;
  projects: { id: string; name: string }[];
  roletas: { id: string; nome: string }[];
  brokers: { id: string; name: string }[];
  leads: any[];
}

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "60d", label: "60 dias" },
  { value: "90d", label: "90 dias" },
  { value: "custom", label: "Personalizado" },
];

export function GlobalFilters({ filters, onChange, projects, roletas, brokers, leads }: GlobalFiltersProps) {
  const origins = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l: any) => { if (l.lead_origin) set.add(l.lead_origin); });
    return Array.from(set).sort();
  }, [leads]);

  const campaigns = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l: any) => { if (l.lead_origin_detail) set.add(l.lead_origin_detail); });
    return Array.from(set).sort();
  }, [leads]);

  const handlePeriod = (value: string) => {
    const now = new Date();
    const from = new Date(now);
    let preset = value as IntelligenceFilters["periodPreset"];
    switch (value) {
      case "today": from.setHours(0, 0, 0, 0); break;
      case "7d": from.setDate(from.getDate() - 7); break;
      case "30d": from.setDate(from.getDate() - 30); break;
      case "60d": from.setDate(from.getDate() - 60); break;
      case "90d": from.setDate(from.getDate() - 90); break;
      default: preset = "custom"; break;
    }
    if (preset !== "custom") {
      onChange({ ...filters, periodPreset: preset, dateFrom: from, dateTo: now });
    } else {
      onChange({ ...filters, periodPreset: "custom" });
    }
  };

  const clearFilters = () => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    onChange({
      periodPreset: "30d", dateFrom: from, dateTo: now,
      projectIds: [], roletaId: null, brokerId: null, origins: [], campaign: null,
    });
  };

  const hasActiveFilters = filters.projectIds.length > 0 || filters.roletaId || filters.brokerId || filters.origins.length > 0 || filters.campaign;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-[#1e1e22] border border-[#2a2a2e] rounded-xl mb-4">
      {/* Period */}
      <Select value={filters.periodPreset} onValueChange={handlePeriod}>
        <SelectTrigger className="w-[130px] bg-[#141417] border-[#2a2a2e] text-white h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
          {PERIOD_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.periodPreset === "custom" && (
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="bg-[#141417] border-[#2a2a2e] text-white text-xs h-9 gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(filters.dateFrom, "dd/MM", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#1e1e22] border-[#2a2a2e]" align="start">
              <CalendarComp mode="single" selected={filters.dateFrom} onSelect={(d) => d && onChange({ ...filters, dateFrom: d })} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-slate-500">—</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="bg-[#141417] border-[#2a2a2e] text-white text-xs h-9 gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(filters.dateTo, "dd/MM", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#1e1e22] border-[#2a2a2e]" align="start">
              <CalendarComp mode="single" selected={filters.dateTo} onSelect={(d) => d && onChange({ ...filters, dateTo: d })} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Project */}
      <Select value={filters.projectIds[0] || "all"} onValueChange={(v) => onChange({ ...filters, projectIds: v === "all" ? [] : [v] })}>
        <SelectTrigger className="w-[140px] bg-[#141417] border-[#2a2a2e] text-white h-9 text-xs">
          <SelectValue placeholder="Empreendimento" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
          <SelectItem value="all" className="text-white text-xs">Todos</SelectItem>
          {projects.map(p => <SelectItem key={p.id} value={p.id} className="text-white text-xs">{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Roleta */}
      <Select value={filters.roletaId || "all"} onValueChange={(v) => onChange({ ...filters, roletaId: v === "all" ? null : v })}>
        <SelectTrigger className="w-[120px] bg-[#141417] border-[#2a2a2e] text-white h-9 text-xs">
          <SelectValue placeholder="Roleta" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
          <SelectItem value="all" className="text-white text-xs">Todas</SelectItem>
          {roletas.map(r => <SelectItem key={r.id} value={r.id} className="text-white text-xs">{r.nome}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Broker */}
      <Select value={filters.brokerId || "all"} onValueChange={(v) => onChange({ ...filters, brokerId: v === "all" ? null : v })}>
        <SelectTrigger className="w-[130px] bg-[#141417] border-[#2a2a2e] text-white h-9 text-xs">
          <SelectValue placeholder="Corretor" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
          <SelectItem value="all" className="text-white text-xs">Todos</SelectItem>
          {brokers.map(b => <SelectItem key={b.id} value={b.id} className="text-white text-xs">{b.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Origin */}
      <Select value={filters.origins[0] || "all"} onValueChange={(v) => onChange({ ...filters, origins: v === "all" ? [] : [v] })}>
        <SelectTrigger className="w-[120px] bg-[#141417] border-[#2a2a2e] text-white h-9 text-xs">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
          <SelectItem value="all" className="text-white text-xs">Todas</SelectItem>
          {origins.map(o => <SelectItem key={o} value={o} className="text-white text-xs">{o}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Campaign */}
      {campaigns.length > 0 && (
        <Select value={filters.campaign || "all"} onValueChange={(v) => onChange({ ...filters, campaign: v === "all" ? null : v })}>
          <SelectTrigger className="w-[130px] bg-[#141417] border-[#2a2a2e] text-white h-9 text-xs">
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
            <SelectItem value="all" className="text-white text-xs">Todas</SelectItem>
            {campaigns.map(c => <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-slate-400 hover:text-white gap-1">
          <X className="w-3.5 h-3.5" /> Limpar
        </Button>
      )}
    </div>
  );
}
