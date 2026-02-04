import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ban, Trash2, Loader2 } from "lucide-react";
import { useWhatsAppOptouts } from "@/hooks/use-whatsapp-optouts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function OptoutsList() {
  const { optouts, isLoading, removeOptout } = useWhatsAppOptouts();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await removeOptout(id);
    } finally {
      setRemovingId(null);
    }
  };

  const formatPhone = (phone: string) => {
    // Format +5551999999999 to +55 51 99999-9999
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
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
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" />
            <span>Opt-outs</span>
            <span className="text-sm font-normal text-slate-400">
              ({optouts.length} telefones)
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {optouts.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Nenhum opt-out registrado.
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {optouts.map((optout) => (
                <div
                  key={optout.id}
                  className="flex items-center justify-between p-3 bg-[#0f0f12] rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-white truncate">
                      {formatPhone(optout.phone)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {optout.detected_keyword && (
                        <span className="text-red-400">"{optout.detected_keyword}"</span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(optout.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-red-400 h-8 w-8"
                        disabled={removingId === optout.id}
                      >
                        {removingId === optout.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                          Remover opt-out?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Isso permitirá que você envie mensagens para{" "}
                          {formatPhone(optout.phone)} novamente. Tenha certeza
                          de que a pessoa deseja receber mensagens.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#2a2a2e] border-[#3a3a3e] text-white hover:bg-[#3a3a3e]">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(optout.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
