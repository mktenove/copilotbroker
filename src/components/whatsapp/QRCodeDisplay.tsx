import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, QrCode } from "lucide-react";

interface QRCodeDisplayProps {
  qrCode: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function QRCodeDisplay({ qrCode, isLoading, onRefresh }: QRCodeDisplayProps) {
  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isLoading ? (
          <div className="w-64 h-64 flex items-center justify-center bg-[#0d0d0f] rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : qrCode ? (
          <div className="p-4 bg-white rounded-lg">
            <img 
              src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
              alt="WhatsApp QR Code"
              className="w-56 h-56 object-contain"
            />
          </div>
        ) : (
          <div className="w-64 h-64 flex flex-col items-center justify-center bg-[#0d0d0f] rounded-lg gap-4">
            <QrCode className="w-12 h-12 text-slate-600" />
            <p className="text-sm text-slate-500 text-center">
              Clique abaixo para gerar o QR Code
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="border-[#2a2a2e] text-slate-300 hover:bg-[#2a2a2e]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Gerar QR Code
            </Button>
          </div>
        )}

        {qrCode && (
          <div className="mt-4 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Abra o WhatsApp no seu celular → Menu → Aparelhos conectados → Conectar um aparelho
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar QR Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
