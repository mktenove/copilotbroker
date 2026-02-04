import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ErrorLog {
  id: string;
  phone: string;
  error_message: string | null;
  error_code: string | null;
  updated_at: string;
  lead?: {
    name: string;
  } | null;
}

interface ErrorLogsCardProps {
  brokerId?: string;
}

export function ErrorLogsCard({ brokerId }: ErrorLogsCardProps) {
  const { data: errorLogs = [], isLoading } = useQuery({
    queryKey: ["whatsapp-error-logs", brokerId],
    queryFn: async () => {
      if (!brokerId) return [];

      const { data, error } = await supabase
        .from("whatsapp_message_queue")
        .select(`
          id,
          phone,
          error_message,
          error_code,
          updated_at,
          lead:leads(name)
        `)
        .eq("broker_id", brokerId)
        .eq("status", "failed")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as ErrorLog[];
    },
    enabled: !!brokerId,
  });

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const getErrorLabel = (error: string | null) => {
    if (!error) return "Erro desconhecido";
    if (error.includes("not registered")) return "Número não registrado no WhatsApp";
    if (error.includes("timeout")) return "Timeout na conexão";
    if (error.includes("rate limit")) return "Limite de envio excedido";
    if (error.includes("disconnected")) return "WhatsApp desconectado";
    return error.length > 50 ? error.substring(0, 47) + "..." : error;
  };

  if (isLoading) {
    return (
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Últimos Erros de Envio
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errorLogs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Nenhum erro recente. 🎉
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {errorLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#0f0f12] rounded-lg border-l-2 border-amber-500/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {log.lead?.name || formatPhone(log.phone)}
                      </p>
                      <p className="text-xs text-amber-400 mt-0.5">
                        {getErrorLabel(log.error_message)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.updated_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
