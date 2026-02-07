import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentError {
  id: string;
  notes: string;
  created_at: string;
  leadName: string | null;
}

interface GlobalRecentErrorsProps {
  errors: RecentError[];
  extractErrorMessage: (notes: string) => string;
}

export function GlobalRecentErrors({ errors, extractErrorMessage }: GlobalRecentErrorsProps) {
  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          Erros Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Nenhum erro recente. 🎉
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {errors.map((err) => (
                <div
                  key={err.id}
                  className="p-3 bg-[#0f0f12] rounded-lg border-l-2 border-yellow-500/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {err.leadName || "Lead desconhecido"}
                      </p>
                      <p className="text-xs text-yellow-400 mt-0.5">
                        {extractErrorMessage(err.notes)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(err.created_at), {
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
