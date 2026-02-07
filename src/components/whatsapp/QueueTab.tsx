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
  const statusConfig = STATUS_BADGE[message.status as QueueStatus];
  return (
    <div className="flex flex-col p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]">
      {/* Top: Lead name + Badge */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-white font-medium truncate flex-1 min-w-0">
          {message.lead?.name || message.phone}
        </p>
        <Badge variant={statusConfig.variant} className="text-xs flex-shrink-0">
          {statusConfig.label}
        </Badge>
      </div>
      {/* Middle: Campaign + Time */}
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-slate-500 truncate flex-1 min-w-0">
          {message.campaign?.name}
        </p>
        <p className="text-xs text-slate-500 flex-shrink-0">
          <Clock className="w-3 h-3 inline mr-1" />
          {format(new Date(message.scheduled_at), "HH:mm")}
        </p>
      </div>
      {/* Bottom: Cancel action */}
      <div className="flex justify-end mt-2 pt-2 border-t border-[#2a2a2e]">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-slate-400 hover:text-red-400 gap-1.5"
          onClick={() => onCancel(message.id)}
        >
          <XCircle className="w-4 h-4" />
          <span className="text-xs">Cancelar</span>
        </Button>
      </div>
    </div>
  );
}

function HistoryMessageCard({ message, onRetry }: { message: any; onRetry: (id: string) => void }) {
  const statusConfig = STATUS_BADGE[message.status as QueueStatus];
  const isFailed = message.status === "failed";
  return (
    <div
      className={cn(
        "flex flex-col p-3 rounded-lg border",
        isFailed
          ? "bg-red-500/5 border-red-500/20"
          : "bg-[#1a1a1d] border-[#2a2a2e]"
      )}
    >
      {/* Top: Icon + Lead name + Badge */}
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          {message.status === "sent" ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : isFailed ? (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          ) : (
            <XCircle className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <p className="text-sm text-white font-medium truncate flex-1 min-w-0">
          {message.lead?.name || message.phone}
        </p>
        <Badge variant={statusConfig.variant} className="text-xs flex-shrink-0">
          {statusConfig.label}
        </Badge>
      </div>
      {/* Middle: Error or time */}
      {(isFailed && message.error_message) ? (
        <p className="text-xs text-red-400 truncate mt-1 ml-7">
          {message.error_message}
        </p>
      ) : message.sent_at ? (
        <p className="text-xs text-slate-500 mt-1 ml-7">
          Enviado às {format(new Date(message.sent_at), "HH:mm")}
        </p>
      ) : null}
      {/* Bottom: Retry for failed */}
      {isFailed && (
        <div className="flex justify-end mt-2 pt-2 border-t border-[#2a2a2e]">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-slate-400 hover:text-primary gap-1.5"
            onClick={() => onRetry(message.id)}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs">Tentar novamente</span>
          </Button>
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
        /* Empty State */
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
          {/* Pending Messages */}
          {pendingMessages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400">Pendentes ({pendingMessages.length})</h3>
              <div className="space-y-2">
                {pendingMessages.map((message) => (
                  <PendingMessageCard
                    key={message.id}
                    message={message}
                    onCancel={cancelMessage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Messages */}
          {completedMessages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400">Histórico ({completedMessages.length})</h3>
              <div className="space-y-2">
                {completedMessages.slice(0, 20).map((message) => (
                  <HistoryMessageCard
                    key={message.id}
                    message={message}
                    onRetry={retryMessage}
                  />
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
