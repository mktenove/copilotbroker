import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Clock } from "lucide-react";

export function QueueTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Fila de Envio</h2>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          Próximo envio em: --:--
        </div>
      </div>

      {/* Empty State */}
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2a2a2e] flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-slate-500" />
          </div>
          <CardTitle className="text-white mb-2">Fila vazia</CardTitle>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Quando você iniciar uma campanha, as mensagens aparecerão aqui com o status de cada envio.
          </p>
        </CardContent>
      </Card>

      {/* Stats Preview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-xs text-slate-500">Na fila</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-400">0</p>
            <p className="text-xs text-slate-500">Enviados</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-400">0</p>
            <p className="text-xs text-slate-500">Falhas</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-blue-400">0</p>
            <p className="text-xs text-slate-500">Respostas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
