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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Fila de Envio</h2>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Timer className="w-4 h-4" />
          Próximo envio em: <span className="font-mono text-primary">{formatNextSendIn()}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.queued}</p>
            <p className="text-xs text-slate-500">Na fila</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.sent}</p>
            <p className="text-xs text-slate-500">Enviados</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            <p className="text-xs text-slate-500">Falhas</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.replies}</p>
            <p className="text-xs text-slate-500">Respostas</p>
          </CardContent>
        </Card>
      </div>

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
                {pendingMessages.map((message) => {
                  const statusConfig = STATUS_BADGE[message.status as QueueStatus];
                  return (
                    <div
                      key={message.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {message.lead?.name || message.phone}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {message.campaign?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={statusConfig.variant} className="text-xs">
                          {statusConfig.label}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {format(new Date(message.scheduled_at), "HH:mm")}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-red-400"
                        onClick={() => cancelMessage(message.id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Messages */}
          {completedMessages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400">Histórico ({completedMessages.length})</h3>
              <div className="space-y-2">
                {completedMessages.slice(0, 20).map((message) => {
                  const statusConfig = STATUS_BADGE[message.status as QueueStatus];
                  const isFailed = message.status === "failed";
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border",
                        isFailed 
                          ? "bg-red-500/5 border-red-500/20" 
                          : "bg-[#1a1a1d] border-[#2a2a2e]"
                      )}
                    >
                      <div className="flex-shrink-0">
                        {message.status === "sent" ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : isFailed ? (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {message.lead?.name || message.phone}
                        </p>
                        {isFailed && message.error_message && (
                          <p className="text-xs text-red-400 truncate">
                            {message.error_message}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={statusConfig.variant} className="text-xs">
                          {statusConfig.label}
                        </Badge>
                        {message.sent_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(message.sent_at), "HH:mm")}
                          </p>
                        )}
                      </div>
                      {isFailed && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                          onClick={() => retryMessage(message.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
