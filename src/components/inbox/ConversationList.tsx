import { useState, useMemo, useEffect } from "react";
import {
  Search, Inbox, MessageSquare, AlertTriangle, Bot, Clock, Flame,
  ArrowUpDown, ThermometerSun, Target, MoreVertical, Check, Zap,
  TrendingUp, Eye, EyeOff, ChevronDown, MessageCircleMore, LayoutGrid, Archive
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Conversation } from "@/hooks/use-conversations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  isLoading: boolean;
  totalUnread: number;
  // Quick actions
  onMarkAsRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  // Admin mode
  isAdminView?: boolean;
}

type SortMode = "recent" | "unread" | "temperature" | "opportunity" | "risk" | "idle";

const STATUS_FILTERS = [
  { id: "all", label: "Todas", icon: Inbox },
  { id: "unread", label: "Não lidas", icon: MessageSquare },
  { id: "attending", label: "Atendendo", icon: Clock },
  { id: "waiting_reply", label: "Aguardando", icon: AlertTriangle },
  { id: "archived", label: "Arquivadas", icon: Archive },
];

const SORT_OPTIONS: { id: SortMode; label: string; icon: typeof ArrowUpDown }[] = [
  { id: "recent", label: "Mais recentes", icon: Clock },
  { id: "unread", label: "Não lidas primeiro", icon: MessageSquare },
  { id: "temperature", label: "Temperatura", icon: ThermometerSun },
  { id: "opportunity", label: "Oportunidade", icon: Target },
  { id: "risk", label: "Em risco", icon: AlertTriangle },
  { id: "idle", label: "Mais tempo parado", icon: Clock },
];

function InboxKPIs({ conversations, activeKpi, onKpiClick }: { conversations: Conversation[]; activeKpi: string | null; onKpiClick: (kpi: string) => void }) {
  const stats = useMemo(() => {
    const active = conversations.length;
    const unread = conversations.filter(c => c.unread_count > 0).length;
    const atRisk = conversations.filter(c => {
      const lead = c.lead as any;
      return c.temperature <= 3 && lead?.status !== "sold" && lead?.status !== "inactive";
    }).length;
    const hot = conversations.filter(c => c.temperature >= 8).length;

    return { active, unread, atRisk, hot };
  }, [conversations]);

  const kpis = [
    { id: "active", label: "Ativas", value: stats.active, color: "text-slate-300" },
    { id: "unread", label: "Não lidas", value: stats.unread, color: "text-red-400", highlight: stats.unread > 0 },
    { id: "hot", label: "Quentes", value: stats.hot, color: "text-orange-400", icon: Flame },
    { id: "risk", label: "Em risco", value: stats.atRisk, color: "text-red-400", icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-4 gap-1 px-3 py-2">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isActive = activeKpi === kpi.id;
        return (
          <button
            key={kpi.id}
            onClick={() => onKpiClick(kpi.id)}
            className={cn(
              "flex flex-col items-center py-1.5 rounded-lg transition-all",
              isActive
                ? "bg-[#FFFF00]/15 ring-1 ring-[#FFFF00]/30"
                : kpi.highlight ? "bg-red-500/10 hover:bg-red-500/15" : "bg-[#1e1e22] hover:bg-[#252528]"
            )}
          >
            <div className="flex items-center gap-0.5">
              {Icon && <Icon className={cn("w-3 h-3", kpi.color)} />}
              <span className={cn("text-base font-bold", kpi.color)}>{kpi.value}</span>
            </div>
            <span className="text-[9px] text-slate-500">{kpi.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Stable animation style for active cadence (matches KanbanCard)
const RING_PULSE_STYLE: React.CSSProperties = {
  animation: "ring-pulse 3s ease-in-out infinite",
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isLoading,
  totalUnread,
  onMarkAsRead,
  onArchive,
  isAdminView,
}: ConversationListProps) {
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [cadenciaLeadIds, setCadenciaLeadIds] = useState<Set<string>>(new Set());

  // Fetch lead IDs with active cadences (pending messages in queue)
  useEffect(() => {
    const leadIds = conversations.filter(c => c.lead_id).map(c => c.lead_id!);
    if (leadIds.length === 0) { setCadenciaLeadIds(new Set()); return; }

    const fetchCadencias = async () => {
      const { data } = await supabase
        .from("whatsapp_message_queue")
        .select("lead_id")
        .in("lead_id", leadIds)
        .in("status", ["queued", "scheduled"]);
      if (data) {
        setCadenciaLeadIds(new Set(data.map((d: any) => d.lead_id)));
      }
    };
    fetchCadencias();
  }, [conversations]);

  const handleKpiClick = (kpi: string) => {
    setActiveKpi(prev => prev === kpi ? null : kpi);
  };

  const kpiFilteredConversations = useMemo(() => {
    if (!activeKpi) return conversations;
    switch (activeKpi) {
      case "unread":
        return conversations.filter(c => c.unread_count > 0);
      case "hot":
        return conversations.filter(c => (c.temperature || 0) >= 8);
      case "risk":
        return conversations.filter(c => {
          const lead = c.lead as any;
          return (c.temperature || 5) <= 3 && lead?.status !== "sold" && lead?.status !== "inactive";
        });
      case "active":
      default:
        return conversations;
    }
  }, [conversations, activeKpi]);

  const sortedConversations = useMemo(() => {
    const sorted = [...kpiFilteredConversations];
    switch (sortMode) {
      case "unread":
        sorted.sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0));
        break;
      case "temperature":
        sorted.sort((a, b) => (b.temperature || 0) - (a.temperature || 0));
        break;
      case "opportunity":
        sorted.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
        break;
      case "risk": {
        sorted.sort((a, b) => (a.temperature || 5) - (b.temperature || 5));
        break;
      }
      case "idle": {
        sorted.sort((a, b) => {
          const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return aTime - bTime;
        });
        break;
      }
      default:
        break;
    }
    return sorted;
  }, [kpiFilteredConversations, sortMode]);

  return (
    <div className="flex flex-col h-full bg-[#141417]">
      {/* Header */}
      <div className="px-3 pt-3 pb-1 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[#FFFF00]" />
            {isAdminView ? "Inbox Admin" : "Inbox"}
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 min-w-[20px] h-5">
                {totalUnread}
              </Badge>
            )}
          </h2>

          {/* Sort selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 gap-1">
                <ArrowUpDown className="w-3 h-3" />
                Ordenar
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1e1e22] border-[#2a2a2e]">
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => setSortMode(opt.id)}
                    className={cn(
                      "text-xs gap-2",
                      sortMode === opt.id ? "text-[#FFFF00]" : "text-slate-300"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                    {sortMode === opt.id && <Check className="w-3 h-3 ml-auto" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-8 h-9 bg-[#1e1e22] border-[#2a2a2e] text-sm text-white placeholder:text-slate-500"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => onStatusFilterChange(f.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors",
                  statusFilter === f.id
                    ? "bg-[#FFFF00] text-black font-medium"
                    : "bg-[#1e1e22] text-slate-400 hover:bg-[#2a2a2e]"
                )}
              >
                <Icon className="w-3 h-3" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPIs */}
      <InboxKPIs conversations={conversations} activeKpi={activeKpi} onKpiClick={handleKpiClick} />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-[#FFFF00] border-t-transparent rounded-full" />
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            sortedConversations.map((conv) => {
              const leadName = (conv.lead as any)?.name || conv.phone;
              const leadStatus = (conv.lead as any)?.status;
              const isSelected = selectedId === conv.id;
              const isUnread = conv.unread_count > 0;
              const isHot = (conv.temperature || 0) >= 8;
              const isAtRisk = (conv.temperature || 5) <= 3 && leadStatus !== "sold" && leadStatus !== "inactive";
              const hasCopilot = conv.ai_mode === "ai_active";
              const score = conv.opportunity_score || 0;
              const idleHours = conv.last_message_at
                ? (Date.now() - new Date(conv.last_message_at).getTime()) / (1000 * 60 * 60)
                : 0;
              const hasCadenciaAtiva = conv.lead_id ? cadenciaLeadIds.has(conv.lead_id) : false;

              return (
                <div key={conv.id} className="group relative">
                  <button
                    onClick={() => onSelect(conv)}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      isSelected
                        ? "bg-[#FFFF00]/10 border border-[#FFFF00]/20"
                        : isUnread
                        ? "bg-[#1e1e22] hover:bg-[#252528]"
                        : "hover:bg-[#1e1e22]"
                    )}
                    style={hasCadenciaAtiva ? RING_PULSE_STYLE : undefined}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                      isUnread ? "bg-[#FFFF00]/20 text-[#FFFF00]" : "bg-[#2a2a2e] text-slate-400"
                    )}>
                      {leadName.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "text-sm truncate",
                          isUnread ? "font-bold text-white" : "font-medium text-slate-300"
                        )}>
                          {leadName}
                        </span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {conv.last_message_at
                            ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ptBR })
                            : ""}
                        </span>
                      </div>

                      {/* Preview */}
                      <p className={cn(
                        "text-xs truncate mt-0.5",
                        isUnread ? "text-slate-300" : "text-slate-500"
                      )}>
                        {conv.last_message_direction === "outbound" && "Você: "}
                        {conv.last_message_preview || "Sem mensagens"}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {isUnread && conv.unread_count > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                            {conv.unread_count}
                          </Badge>
                        )}
                        {isHot && (
                          <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                            <Flame className="w-3 h-3" /> Quente
                          </span>
                        )}
                        {isAtRisk && (
                          <span className="flex items-center gap-0.5 text-[10px] text-red-400 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Risco
                          </span>
                        )}
                        {hasCopilot && (
                          <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                            <Bot className="w-3 h-3" /> IA
                          </span>
                        )}
                        {score > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[#FFFF00]/70">
                            <Target className="w-3 h-3" /> {score}%
                          </span>
                        )}
                        {idleHours > 24 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400/70">
                            <Clock className="w-3 h-3" /> {idleHours > 48 ? `${Math.floor(idleHours / 24)}d` : `${Math.round(idleHours)}h`} parado
                          </span>
                        )}
                        {/* Lead linkage badge */}
                        {conv.lead_id ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                            <LayoutGrid className="w-3 h-3" /> Kanban
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                            <MessageCircleMore className="w-3 h-3" /> WA direto
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Quick actions on hover */}
                  {(onMarkAsRead || onArchive) && (
                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1e1e22] border-[#2a2a2e]">
                          {isUnread && onMarkAsRead && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); onMarkAsRead(conv.id); }}
                              className="text-xs gap-2 text-slate-300"
                            >
                              <Eye className="w-3 h-3" /> Marcar como lida
                            </DropdownMenuItem>
                          )}
                          {onArchive && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); onArchive(conv.id); }}
                              className="text-xs gap-2 text-slate-300"
                            >
                              <EyeOff className="w-3 h-3" /> Arquivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
