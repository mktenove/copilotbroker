import { useWhatsAppGlobalInstance } from "@/hooks/use-whatsapp-global-instance";
import { ConnectionStatusCard } from "./ConnectionStatusCard";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Loader2, RefreshCw, Power, RotateCcw, Globe, AlertTriangle, Trash2, Plus, Wifi } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GlobalConnectionTab() {
  const {
    status,
    phoneNumber,
    instanceName,
    lastSeenAt,
    error,
    needsInit,
    isLoading,
    qrCode,
    isLoadingQR,
    isInitializing,
    refreshStatus,
    initInstance,
    fetchQRCode,
    logout,
    restart,
    clearSession,
  } = useWhatsAppGlobalInstance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = status === "connected";
  const needsQR = status === "qr_pending" || status === "disconnected";
  const showCreateButton = needsInit || (status === "disconnected" && error);

  // No instance yet - show init card (similar to ConnectionTab)
  if (needsInit && !qrCode) {
    return (
      <Card className="bg-[#1a1a1d] border-[#2a2a2e] max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
          <CardTitle className="text-white">Conectar Instância Global</CardTitle>
          <CardDescription>
            Configure a instância global da Enove para enviar notificações de novos leads aos corretores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            onClick={initInstance}
            disabled={isInitializing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isInitializing ? (
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

  return (
    <div className="space-y-6">
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

      {/* Main Connection Card */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Status da Conexão Global
            </CardTitle>
            {instanceName && (
              <CardDescription>
                Instância: {instanceName}
              </CardDescription>
            )}
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
                        Limpar Sessão
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Limpar sessão global?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Esta ação irá desconectar a instância e limpar a sessão. 
                          Você precisará escanear o QR Code novamente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearSession}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Limpar Sessão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code or Connected Info Card */}
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
    </div>
  );
}
