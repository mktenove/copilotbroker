import { X, ChevronDown, CalendarIcon, MapPin, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LeadStatus, STATUS_CONFIG, LEAD_ORIGINS, getOriginDisplayLabel } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Broker {
  id: string;
  name: string;
  slug: string;
}

export interface LeadFilters {
  statusFilter: LeadStatus[];
  brokerFilter: string;
  originFilter: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  includeInactive: boolean;
}

interface LeadsAdvancedFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  brokers: Broker[];
  activeFiltersCount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const STATUS_OPTIONS: LeadStatus[] = ["new", "info_sent", "awaiting_docs", "docs_received", "registered"];

const LeadsAdvancedFilters = ({
  filters,
  onFiltersChange,
  brokers,
  activeFiltersCount,
  searchTerm,
  onSearchChange,
}: LeadsAdvancedFiltersProps) => {
  const updateFilter = <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleStatus = (status: LeadStatus) => {
    const newStatuses = filters.statusFilter.includes(status)
      ? filters.statusFilter.filter((s) => s !== status)
      : [...filters.statusFilter, status];
    updateFilter("statusFilter", newStatuses);
  };

  const toggleOrigin = (origin: string) => {
    const newOrigins = filters.originFilter.includes(origin)
      ? filters.originFilter.filter((o) => o !== origin)
      : [...filters.originFilter, origin];
    updateFilter("originFilter", newOrigins);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      statusFilter: [],
      brokerFilter: "all",
      originFilter: [],
      dateFrom: undefined,
      dateTo: undefined,
      includeInactive: false,
    });
  };

  const removeStatusFilter = (status: LeadStatus) => {
    updateFilter("statusFilter", filters.statusFilter.filter((s) => s !== status));
  };

  const removeOriginFilter = (origin: string) => {
    updateFilter("originFilter", filters.originFilter.filter((o) => o !== origin));
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou WhatsApp..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      {/* Filters Panel - Always Visible */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status (Fase)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                >
                  {filters.statusFilter.length === 0
                    ? "Todos os status"
                    : `${filters.statusFilter.length} selecionado(s)`}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start">
                <div className="space-y-1">
                  {STATUS_OPTIONS.map((status) => (
                    <label
                      key={status}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.statusFilter.includes(status)}
                        onCheckedChange={() => toggleStatus(status)}
                      />
                      <span
                        className={cn(
                          "text-sm px-2 py-0.5 rounded-full",
                          STATUS_CONFIG[status].bgColor,
                          STATUS_CONFIG[status].color
                        )}
                      >
                        {STATUS_CONFIG[status].label}
                      </span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Broker Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Corretor</label>
            <Select
              value={filters.brokerFilter}
              onValueChange={(value) => updateFilter("brokerFilter", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="enove">Enove (sem corretor)</SelectItem>
                {brokers.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Origin Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Origem</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                >
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {filters.originFilter.length === 0
                      ? "Todas as origens"
                      : `${filters.originFilter.length} selecionada(s)`}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-2 max-h-[300px] overflow-y-auto" align="start">
                <div className="space-y-1">
                  {LEAD_ORIGINS.map((origin) => (
                    <label
                      key={origin.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.originFilter.includes(origin.key)}
                        onCheckedChange={() => toggleOrigin(origin.key)}
                      />
                      <span className="text-sm">{origin.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Período</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => updateFilter("dateFrom", date)}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => updateFilter("dateTo", date)}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Include Inactive Toggle + Clear Button */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.includeInactive}
              onCheckedChange={(checked) => updateFilter("includeInactive", !!checked)}
            />
            <span className="text-sm text-muted-foreground">Incluir leads inativos</span>
          </label>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar filtros ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.statusFilter.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => removeStatusFilter(status)}
            >
              {STATUS_CONFIG[status].label}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {filters.brokerFilter !== "all" && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => updateFilter("brokerFilter", "all")}
            >
              {filters.brokerFilter === "enove"
                ? "Enove"
                : brokers.find((b) => b.id === filters.brokerFilter)?.name || "Corretor"}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.originFilter.map((origin) => (
            <Badge
              key={origin}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => removeOriginFilter(origin)}
            >
              {getOriginDisplayLabel(origin)}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {filters.dateFrom && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => updateFilter("dateFrom", undefined)}
            >
              De: {format(filters.dateFrom, "dd/MM/yy")}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => updateFilter("dateTo", undefined)}
            >
              Até: {format(filters.dateTo, "dd/MM/yy")}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.includeInactive && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => updateFilter("includeInactive", false)}
            >
              Inclui inativos
              <X className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadsAdvancedFilters;
