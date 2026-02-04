import { useWhatsAppInstance } from "@/hooks/use-whatsapp-instance";
import { ConnectionStatusCard } from "./ConnectionStatusCard";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { HealthScoreCard } from "./HealthScoreCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, Power, RotateCcw, Wifi, AlertTriangle, Trash2 } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ConnectionTab() {
  const {
    instance,
    isLoading,
    qrCode,
    isLoadingQR,
    error,
    initInstance,
    refreshStatus,
    fetchQRCode,
    logout,
    restart,
    deleteInstance,
  } = useWhatsAppInstance();

  if (isLoading && !instance) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No instance yet - show init button
  if (!instance) {
    return (
      <Card className="bg-[#1a1a1d] border-[#2a2a2e] max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Wifi className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="text-white">Conectar WhatsApp</CardTitle>
          <CardDescription>
            Vincule seu número de WhatsApp para começar a disparar mensagens automatizadas para seus leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            onClick={initInstance}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Wifi className="w-4 h-4 mr-2" />
            )}
            Iniciar Conexão
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isConnected = instance.status === "connected";
  const needsQR = instance.status === "qr_pending" || instance.status === "disconnected";

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao verificar status</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Não foi possível verificar o status agora. Clique em Atualizar.</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshStatus}
              className="ml-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Atualizar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Connection Card */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectionStatusCard status={instance.status} />
            
            {instance.phone_number && (
              <div className="text-sm text-slate-400">
                <span className="text-slate-500">Número:</span>{" "}
                <span className="text-white font-mono">{instance.phone_number}</span>
              </div>
            )}
            
            {instance.connected_at && (
              <div className="text-sm text-slate-400">
                <span className="text-slate-500">Conectado há:</span>{" "}
                {formatDistanceToNow(new Date(instance.connected_at), { 
                  locale: ptBR, 
                  addSuffix: false 
                })}
              </div>
            )}

            {instance.last_seen_at && (
              <div className="text-sm text-slate-400">
                <span className="text-slate-500">Última atividade:</span>{" "}
                {formatDistanceToNow(new Date(instance.last_seen_at), { 
                  locale: ptBR, 
                  addSuffix: true 
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#2a2a2e]">
              {needsQR && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchQRCode}
                  disabled={isLoadingQR}
                  className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]"
                >
                  {isLoadingQR ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Novo QR Code
                </Button>
              )}
              
              {isConnected && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={restart}
                    disabled={isLoading}
                    className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reiniciar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    disabled={isLoading}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Desconectar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Deletar instância?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Esta ação é irreversível. A instância será removida permanentemente 
                          e você precisará criar uma nova conexão do zero.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteInstance}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Deletar permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code or Health Card */}
        {needsQR ? (
          <QRCodeDisplay 
            qrCode={qrCode} 
            isLoading={isLoadingQR} 
            onRefresh={fetchQRCode} 
          />
        ) : (
          <HealthScoreCard instance={instance} />
        )}
      </div>

      {/* Warmup Info */}
      {instance.warmup_stage !== "normal" && (
        <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-lg">🔥</span>
              </div>
              <div>
                <p className="font-medium text-amber-200">
                  Período de Aquecimento - Dia {instance.warmup_day} de 14
                </p>
                <p className="text-sm text-amber-200/70">
                  Limite atual: {instance.daily_limit} msgs/dia | {instance.hourly_limit} msgs/hora
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
