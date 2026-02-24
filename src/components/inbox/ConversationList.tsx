import { useState } from "react";
import { Search, Filter, Inbox, MessageSquare, Archive, Flame, AlertTriangle, Bot, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

const STATUS_FILTERS = [
  { id: "all", label: "Todas", icon: Inbox },
  { id: "unread", label: "Não lidas", icon: MessageSquare },
  { id: "attending", label: "Em atendimento", icon: Clock },
  { id: "waiting_reply", label: "Aguardando", icon: AlertTriangle },
];

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
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full bg-[#141417]">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[#FFFF00]" />
            Inbox
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 min-w-[20px] h-5">
                {totalUnread}
              </Badge>
            )}
          </h2>
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

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-[#FFFF00] border-t-transparent rounded-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const leadName = (conv.lead as any)?.name || conv.phone;
              const leadStatus = (conv.lead as any)?.status;
              const isSelected = selectedId === conv.id;
              const isUnread = conv.unread_count > 0;
              const isHot = conv.temperature >= 8;
              const isAtRisk = conv.temperature <= 3 && leadStatus !== "sold" && leadStatus !== "inactive";
              const hasCopilot = conv.ai_mode === "ai_active";

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    isSelected
                      ? "bg-[#FFFF00]/10 border border-[#FFFF00]/20"
                      : isUnread
                      ? "bg-[#1e1e22] hover:bg-[#252528]"
                      : "hover:bg-[#1e1e22]"
                  )}
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
                        <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                          <AlertTriangle className="w-3 h-3" /> Risco
                        </span>
                      )}
                      {hasCopilot && (
                        <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                          <Bot className="w-3 h-3" /> IA
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
