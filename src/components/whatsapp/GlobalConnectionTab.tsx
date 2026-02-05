import { useWhatsAppGlobalInstance } from "@/hooks/use-whatsapp-global-instance";
import { ConnectionStatusCard } from "./ConnectionStatusCard";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, RefreshCw, Power, RotateCcw, Globe, AlertTriangle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GlobalConnectionTab() {
  const {
    status,
    phoneNumber,
    instanceName,
    lastSeenAt,
    error,
    isLoading,
    qrCode,
    isLoadingQR,
    refreshStatus,
    fetchQRCode,
    logout,
    restart,
    deleteInstance,
  } = useWhatsAppGlobalInstance();

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = status === "connected";
  const needsQR = status === "qr_pending" || status === "disconnected";

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-blue-200">Instância Global da Enove</p>
              <p className="text-sm text-blue-200/70">
                Usada para enviar notificações de novos leads aos corretores
              </p>
            </div>
            <Badge 
              variant="outline" 
              className="ml-auto border-blue-500/30 text-blue-300"
            >
              Sistema
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao verificar status</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
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

      {/* Main Connection Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Status da Conexão Global
            </CardTitle>
            <CardDescription>
              Instância: {instanceName || "Não configurada"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectionStatusCard status={status} />
            
            {phoneNumber && (
              <div className="text-sm text-slate-400">
                <span className="text-slate-500">Número:</span>{" "}
                <span className="text-white font-mono">{phoneNumber}</span>
              </div>
            )}
            
            {lastSeenAt && (
              <div className="text-sm text-slate-400">
                <span className="text-slate-500">Última verificação:</span>{" "}
                {formatDistanceToNow(new Date(lastSeenAt), { 
                  locale: ptBR, 
                  addSuffix: true 
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#2a2a2e]">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStatus}
                disabled={isLoading}
                className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              {needsQR && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchQRCode}
                  disabled={isLoadingQR}
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  {isLoadingQR ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Gerar QR Code
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
                </>
              )}

              {/* Delete Instance Button - always visible */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="border-red-600/50 text-red-500 hover:bg-red-600/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover Instância
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Remover Instância Global</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      Tem certeza que deseja remover a instância global? Isso irá desconectar a sessão
                      do WhatsApp e pode ser necessário escanear o QR Code novamente para reconectar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-[#2a2a2e] text-slate-300 border-[#3a3a3e] hover:bg-[#3a3a3e]">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteInstance}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* QR Code or Connected Info */}
        {needsQR ? (
          <QRCodeDisplay 
            qrCode={qrCode} 
            isLoading={isLoadingQR} 
            onRefresh={fetchQRCode} 
          />
        ) : (
          <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                ✅ Instância Conectada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-10 h-10 text-green-500" />
                </div>
                <p className="text-slate-300 text-lg font-medium">
                  Pronta para enviar notificações
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Os corretores receberão alertas de novos leads por esta instância
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info about global instance */}
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardHeader>
          <CardTitle className="text-white text-base">Sobre a Instância Global</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400 space-y-2">
          <p>
            Esta é a instância central do sistema, usada exclusivamente para notificações automáticas.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Envia alertas quando novos leads são cadastrados</li>
            <li>Notifica corretores sobre leads atribuídos</li>
            <li>Separada das instâncias individuais de cada corretor</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
