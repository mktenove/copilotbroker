import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Bot, User, Archive, ArchiveRestore, MoreVertical, Sparkles, Zap, LayoutGrid, UserRoundSearch } from "lucide-react";
import { CadenceCountdown } from "./CadenceCountdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Conversation, ConversationMessage } from "@/hooks/use-conversations";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationThreadProps {
  conversation: Conversation;
  messages: ConversationMessage[];
  isLoading: boolean;
  onSendMessage: (content: string, sentBy?: string) => Promise<unknown>;
  onBack: () => void;
  onMarkAsRead: () => void;
  onArchive: () => void;
  onUnarchive?: () => void;
  onToggleAiMode: (mode: string) => void;
  // Copilot
  copilotSuggestion: string;
  isGeneratingSuggestion: boolean;
  onRequestSuggestion: () => void;
  onInsertSuggestion: () => void;
  onDismissSuggestion: () => void;
  onOpenLeadPanel: () => void;
  onCreateLead?: () => void;
  onOpenLead?: (leadId: string) => void;
}

export function ConversationThread({
  conversation,
  messages,
  isLoading,
  onSendMessage,
  onBack,
  onMarkAsRead,
  onArchive,
  onUnarchive,
  onToggleAiMode,
  copilotSuggestion,
  isGeneratingSuggestion,
  onRequestSuggestion,
  onInsertSuggestion,
  onDismissSuggestion,
  onOpenLeadPanel,
  onCreateLead,
  onOpenLead,
}: ConversationThreadProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const leadName = (conversation.lead as any)?.name || conversation.phone;
  const isAiActive = conversation.ai_mode === "ai_active";
  const isCopilot = conversation.ai_mode === "copilot";

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read on open
  useEffect(() => {
    if (conversation.unread_count > 0) {
      onMarkAsRead();
    }
  }, [conversation.id]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setInputValue("");
    await onSendMessage(text);
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertSuggestion = () => {
    setInputValue(copilotSuggestion);
    onInsertSuggestion();
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex flex-col h-full bg-[#141417]"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
        touchStartX.current = null;
        touchStartY.current = null;
        // Swipe right > 80px and mostly horizontal
        if (dx > 80 && dy < 60) {
          onBack();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2e] bg-[#1a1a1e]">
        <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden text-slate-400 h-8 w-8">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <button onClick={onOpenLeadPanel} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#FFFF00]/20 flex items-center justify-center text-[#FFFF00] font-bold text-sm flex-shrink-0">
            {leadName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{leadName}</p>
            <p className="text-[10px] text-slate-500">{conversation.phone}</p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {conversation.lead_id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenLead ? onOpenLead(conversation.lead_id!) : navigate(`/corretor/lead/${conversation.lead_id}`)}
              className="text-slate-400 hover:text-[#FFFF00] h-8 w-8"
              title="Ver perfil do lead"
            >
              <UserRoundSearch className="w-4 h-4" />
            </Button>
          )}
          {conversation.is_archived && onUnarchive ? (
            <Button variant="ghost" size="icon" onClick={onUnarchive} className="text-slate-400 h-8 w-8" title="Desarquivar">
              <ArchiveRestore className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={onArchive} className="text-slate-400 h-8 w-8" title="Arquivar">
              <Archive className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* No Lead Banner */}
      {!conversation.lead_id && onCreateLead && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-orange-500/10 border-b border-orange-500/20">
          <span className="text-xs text-orange-400 flex items-center gap-1">
            <LayoutGrid className="w-3 h-3" /> Contato sem card no Kanban
          </span>
          <Button size="sm" className="h-6 text-xs bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onCreateLead}>
            Criar Card
          </Button>
        </div>
      )}

      {/* AI Mode Banner */}
      {isAiActive && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-green-500/10 border-b border-green-500/20">
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Piloto Automático ativo
          </span>
          <Button size="sm" variant="outline" className="h-6 text-xs border-green-500/30 text-green-400"
            onClick={() => onToggleAiMode("copilot")}>
            Assumir Atendimento
          </Button>
        </div>
      )}
      {isCopilot && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/20">
          <span className="text-xs text-blue-400 flex items-center gap-1">
            <User className="w-3 h-3" /> Modo Copiloto (Humano no controle)
          </span>
          <Button size="sm" variant="outline" className="h-6 text-xs border-blue-500/30 text-blue-400"
            onClick={() => onToggleAiMode("ai_active")}>
            Retomar IA
          </Button>
        </div>
      )}

      {/* Cadence Countdown */}
      {conversation.lead_id && (
        <CadenceCountdown leadId={conversation.lead_id} brokerId={conversation.broker_id} />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[#FFFF00] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Nenhuma mensagem ainda. Envie a primeira!
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            const isAi = msg.sent_by === "ai";

            return (
              <div key={msg.id} className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  isOutbound
                    ? isAi
                      ? "bg-green-600/20 text-green-100 rounded-br-sm"
                      : "bg-[#FFFF00]/20 text-yellow-100 rounded-br-sm"
                    : "bg-[#2a2a2e] text-slate-200 rounded-bl-sm"
                )}>
                  {isAi && (
                    <span className="text-[10px] text-green-400 flex items-center gap-0.5 mb-0.5">
                      <Bot className="w-3 h-3" /> Copiloto
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <span className="text-[10px] opacity-50 mt-1 block text-right">
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Copilot Suggestion */}
      {copilotSuggestion && (
        <div className="mx-3 mb-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-[10px] text-blue-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Sugestão do Copiloto
          </p>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{copilotSuggestion}</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="h-7 text-xs bg-[#FFFF00] text-black hover:bg-[#FFFF00]/80"
              onClick={handleInsertSuggestion}>
              Inserir no campo
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400"
              onClick={onDismissSuggestion}>
              Ignorar
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-1 border-t border-[#2a2a2e]">
        <div className="flex items-end gap-2">
          {/* Copilot suggestion button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-blue-400 hover:text-blue-300 h-9 w-9 flex-shrink-0"
            onClick={onRequestSuggestion}
            disabled={isGeneratingSuggestion}
            title="Pedir sugestão ao Copiloto"
          >
            {isGeneratingSuggestion ? (
              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </Button>

          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[36px] max-h-[120px] resize-none bg-[#1e1e22] border-[#2a2a2e] text-sm text-white placeholder:text-slate-500 py-2"
            rows={1}
          />

          <Button
            size="icon"
            className="bg-[#FFFF00] hover:bg-[#FFFF00]/80 text-black h-9 w-9 flex-shrink-0"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
