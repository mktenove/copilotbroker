import { useWhatsAppGlobalInstance } from "@/hooks/use-whatsapp-global-instance";
import { ConnectionStatusCard } from "./ConnectionStatusCard";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, Power, RotateCcw, Wifi, AlertTriangle, Globe } from "lucide-react";

export function AdminConnectionTab() {
  const {
    instance,
    isLoading,
    qrCode,
    isLoadingQR,
    error,
    refreshStatus,
    fetchQRCode,
    logout,
    restart,
  } = useWhatsAppGlobalInstance();

  if (isLoading && !instance) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Config error - UAZAPI not configured
  if (error?.includes("not configured")) {
    return (
      <Card className="bg-[#1a1a1d] border-[#2a2a2e] max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-white">Configuração Necessária</CardTitle>
          <CardDescription>
            As variáveis de ambiente UAZAPI_INSTANCE_URL e UAZAPI_TOKEN precisam ser configuradas para gerenciar a instância global.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isConnected = instance?.status === "connected";
  const needsQR = instance?.status === "qr_pending" || instance?.status === "disconnected";

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="border-blue-500/30 bg-blue-500/10">
        <Globe className="h-4 w-4 text-blue-400" />
        <AlertTitle className="text-blue-300">Instância Global da Enove</AlertTitle>
        <AlertDescription className="text-blue-200/70">
          Esta é a instância central usada para enviar notificações de novos leads para os corretores. 
          Não é a instância individual de cada corretor.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && !error.includes("not configured") && (
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
              <Wifi className="w-5 h-5" />
              Status da Conexão Global
            </CardTitle>
            <CardDescription>
              Instância: {instance?.instance_name || "Carregando..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectionStatusCard status={instance?.status || "disconnected"} />
            
            {instance?.phone_number && (
              <div className="text-sm text-slate-400">
                <span className="text-slate-500">Número:</span>{" "}
                <span className="text-white font-mono">{instance.phone_number}</span>
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
                  className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]"
                >
                  {isLoadingQR ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Obter QR Code
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
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        {needsQR && (
          <QRCodeDisplay 
            qrCode={qrCode} 
            isLoading={isLoadingQR} 
            onRefresh={fetchQRCode} 
          />
        )}

        {/* Connected Info */}
        {isConnected && (
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="py-6">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Wifi className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-300">Conectado</h3>
                  <p className="text-sm text-green-200/70">
                    A instância global está ativa e enviando notificações.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
