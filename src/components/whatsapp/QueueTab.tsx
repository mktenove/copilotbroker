import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Clock, 
  Loader2, 
  XCircle, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Timer
} from "lucide-react";
import { useWhatsAppQueue } from "@/hooks/use-whatsapp-queue";
import { QueueStatus } from "@/types/whatsapp";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_BADGE: Record<QueueStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  queued: { label: "Na fila", variant: "secondary" },
  scheduled: { label: "Agendado", variant: "outline" },
  sending: { label: "Enviando", variant: "default" },
  sent: { label: "Enviado", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "secondary" },
  paused_by_system: { label: "Pausado", variant: "outline" },
};

function truncateMessage(msg?: string, len = 40) {
  if (!msg) return "";
  return msg.length > len ? msg.slice(0, len) + "…" : msg;
}

function QueueStats({ stats }: { stats: { queued: number; sent: number; failed: number; replies: number } }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="py-3 sm:py-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.queued}</p>
          <p className="text-xs text-slate-500">Na fila</p>
        </CardContent>
      </Card>
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="py-3 sm:py-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.sent}</p>
          <p className="text-xs text-slate-500">Enviados</p>
        </CardContent>
      </Card>
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="py-3 sm:py-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
          <p className="text-xs text-slate-500">Falhas</p>
        </CardContent>
      </Card>
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="py-3 sm:py-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.replies}</p>
          <p className="text-xs text-slate-500">Respostas</p>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingMessageCard({ message, onCancel }: { message: any; onCancel: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_BADGE[message.status as QueueStatus];

  return (
    <div
      className="px-3 py-2 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e] cursor-pointer select-none"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-slate-500 flex-shrink-0">
          <Clock className="w-3 h-3 inline mr-0.5" />
          {format(new Date(message.scheduled_at), "HH:mm")}
        </span>
        <span className="text-sm text-white font-medium truncate flex-shrink-0 max-w-[120px]">
          {message.lead?.name || message.phone}
        </span>
        {message.message && (
          <span className="text-xs text-slate-500 italic truncate flex-1 min-w-0">
            · "{truncateMessage(message.message)}"
          </span>
        )}
        <Badge variant={statusConfig.variant} className="text-[10px] flex-shrink-0">
          {statusConfig.label}
        </Badge>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[#2a2a2e]" onClick={(e) => e.stopPropagation()}>
          {message.message && (
            <p className="text-xs text-slate-300 whitespace-pre-wrap mb-2">{message.message}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{message.campaign?.name}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-slate-400 hover:text-red-400 gap-1"
              onClick={() => onCancel(message.id)}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-xs">Cancelar</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryMessageCard({ message, onRetry }: { message: any; onRetry: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_BADGE[message.status as QueueStatus];
  const isFailed = message.status === "failed";

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border cursor-pointer select-none",
        isFailed ? "bg-red-500/5 border-red-500/20" : "bg-[#1a1a1d] border-[#2a2a2e]"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-shrink-0">
          {message.status === "sent" ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : isFailed ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : (
            <XCircle className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <span className="text-sm text-white font-medium truncate flex-shrink-0 max-w-[120px]">
          {message.lead?.name || message.phone}
        </span>
        {message.message && (
          <span className="text-xs text-slate-500 italic truncate flex-1 min-w-0">
            · "{truncateMessage(message.message)}"
          </span>
        )}
        {message.sent_at && (
          <span className="text-xs text-slate-500 flex-shrink-0">
            {format(new Date(message.sent_at), "HH:mm")}
          </span>
        )}
        <Badge variant={statusConfig.variant} className="text-[10px] flex-shrink-0">
          {statusConfig.label}
        </Badge>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[#2a2a2e]" onClick={(e) => e.stopPropagation()}>
          {message.message && (
            <p className="text-xs text-slate-300 whitespace-pre-wrap mb-2">{message.message}</p>
          )}
          {isFailed && message.error_message && (
            <p className="text-xs text-red-400 mb-2">{message.error_message}</p>
          )}
          {isFailed && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-slate-400 hover:text-primary gap-1"
                onClick={() => onRetry(message.id)}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-xs">Tentar novamente</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QueueTab() {
  const { queue, stats, isLoading, formatNextSendIn, cancelMessage, retryMessage } = useWhatsAppQueue();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingMessages = queue.filter(
    m => m.status === "queued" || m.status === "scheduled" || m.status === "sending"
  );
  const completedMessages = queue.filter(
    m => m.status === "sent" || m.status === "failed" || m.status === "cancelled"
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">Fila de Envio</h2>
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-[#1a1a1d] border border-[#2a2a2e] rounded-full px-3 py-1.5 w-fit">
          <Timer className="w-4 h-4 animate-pulse text-primary" />
          <span>Próximo envio em:</span>
          <span className="font-mono text-primary font-medium">{formatNextSendIn()}</span>
        </div>
      </div>

      {/* Stats */}
      <QueueStats stats={stats} />

      {queue.length === 0 ? (
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#2a2a2e] flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-white font-medium mb-2">Fila vazia</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              Quando você iniciar uma campanha, as mensagens aparecerão aqui com o status de cada envio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingMessages.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-400 mb-1">Pendentes ({pendingMessages.length})</h3>
              <div className="space-y-1">
                {pendingMessages.map((message) => (
                  <PendingMessageCard key={message.id} message={message} onCancel={cancelMessage} />
                ))}
              </div>
            </div>
          )}

          {completedMessages.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-400 mb-1">Histórico ({completedMessages.length})</h3>
              <div className="space-y-1">
                {completedMessages.slice(0, 20).map((message) => (
                  <HistoryMessageCard key={message.id} message={message} onRetry={retryMessage} />
                ))}
                {completedMessages.length > 20 && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Mostrando 20 de {completedMessages.length} mensagens
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
