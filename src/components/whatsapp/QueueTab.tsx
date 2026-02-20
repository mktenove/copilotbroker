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
  Timer,
  Phone,
  Hash,
  RotateCw,
  Calendar,
  ChevronDown
} from "lucide-react";
import { useWhatsAppQueue } from "@/hooks/use-whatsapp-queue";
import { useUserRole } from "@/hooks/use-user-role";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueueStatus } from "@/types/whatsapp";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function formatPhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-300">{value}</span>
    </div>
  );
}

function QueueStats({ stats }: { stats: { queued: number; sent: number; failed: number; replies: number; paused: number } }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="py-3 sm:py-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.queued}</p>
          <p className="text-xs text-slate-500">Na fila</p>
        </CardContent>
      </Card>
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="py-3 sm:py-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.paused}</p>
          <p className="text-xs text-slate-500">Pausados</p>
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
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-slate-500 flex-shrink-0">
          <Clock className="w-3 h-3 inline mr-0.5" />
          {format(new Date(message.scheduled_at), "dd/MM/yyyy HH:mm")}
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
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-slate-400 hover:text-red-400 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onCancel(message.id); }}
        >
          <XCircle className="w-3.5 h-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-[#2a2a2e] space-y-2" onClick={(e) => e.stopPropagation()}>
          {message.message && (
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{message.message}</p>
          )}
          <div className="space-y-1">
            <DetailRow icon={Phone} label="Telefone" value={formatPhone(message.phone)} />
            <DetailRow icon={Send} label="Campanha" value={message.campaign?.name} />
            {message.step_number && (
              <DetailRow icon={Hash} label="Etapa" value={`Etapa ${message.step_number}`} />
            )}
            <DetailRow icon={RotateCw} label="Tentativas" value={`${message.attempts || 0}/${message.max_attempts || 3}`} />
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
            {format(new Date(message.sent_at), "dd/MM/yyyy HH:mm")}
          </span>
        )}
        <Badge variant={statusConfig.variant} className="text-[10px] flex-shrink-0">
          {statusConfig.label}
        </Badge>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-[#2a2a2e] space-y-2" onClick={(e) => e.stopPropagation()}>
          {message.message && (
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{message.message}</p>
          )}
          
          <div className="space-y-1">
            <DetailRow icon={Phone} label="Telefone" value={formatPhone(message.phone)} />
            <DetailRow icon={Send} label="Campanha" value={message.campaign?.name} />
            {message.step_number && (
              <DetailRow icon={Hash} label="Etapa" value={`Etapa ${message.step_number}`} />
            )}
            <DetailRow icon={RotateCw} label="Tentativas" value={`${message.attempts || 0}/${message.max_attempts || 3}`} />
            <DetailRow icon={Calendar} label="Agendado em" value={format(new Date(message.scheduled_at), "dd/MM/yyyy HH:mm")} />
          </div>

          {isFailed && (
            <div className="space-y-1">
              {message.error_code && (
                <p className="text-xs text-red-400">Código: {message.error_code}</p>
              )}
              {message.error_message && (
                <p className="text-xs text-red-400">{message.error_message}</p>
              )}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QueueTab() {
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");
  const { role } = useUserRole();

  const { data: brokersList = [] } = useQuery({
    queryKey: ["brokers-list-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brokers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const effectiveFilterId = role === "admin" ? (selectedBrokerId === "all" ? undefined : selectedBrokerId || undefined) : undefined;
  const {
    pendingQueue,
    historyQueue,
    stats,
    isLoading,
    formatNextSendIn,
    cancelMessage,
    retryMessage,
    loadMorePending,
    loadMoreHistory,
    hasMorePending,
    hasMoreHistory,
  } = useWhatsAppQueue(effectiveFilterId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = pendingQueue.length === 0 && historyQueue.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Fila de Envio</h2>
          {role === "admin" && (
            <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
              <SelectTrigger className="w-[200px] bg-[#1a1a1d] border-[#2a2a2e] text-slate-300 h-9">
                <SelectValue placeholder="Todos os corretores" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                <SelectItem value="all">Todos os corretores</SelectItem>
                {brokersList.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-[#1a1a1d] border border-[#2a2a2e] rounded-full px-3 py-1.5 w-fit">
          <Timer className="w-4 h-4 animate-pulse text-primary" />
          <span>Próximo envio em:</span>
          <span className="font-mono text-primary font-medium">{formatNextSendIn()}</span>
        </div>
      </div>

      {/* Stats */}
      <QueueStats stats={stats} />

      {isEmpty ? (
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
          {pendingQueue.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-400 mb-1">
                Pendentes ({stats.queued})
              </h3>
              <div className="space-y-1">
                {pendingQueue.map((message) => (
                  <PendingMessageCard key={message.id} message={message} onCancel={cancelMessage} />
                ))}
              </div>
              {hasMorePending && (
                <Button
                  variant="ghost"
                  onClick={loadMorePending}
                  className="w-full text-slate-400 hover:text-white gap-2 mt-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Carregar mais pendentes...
                </Button>
              )}
            </div>
          )}

          {historyQueue.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-400 mb-1">
                Histórico ({stats.sent + stats.failed})
              </h3>
              <div className="space-y-1">
                {historyQueue.map((message) => (
                  <HistoryMessageCard key={message.id} message={message} onRetry={retryMessage} />
                ))}
              </div>
              {hasMoreHistory && (
                <Button
                  variant="ghost"
                  onClick={loadMoreHistory}
                  className="w-full text-slate-400 hover:text-white gap-2 mt-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Carregar mais histórico...
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
