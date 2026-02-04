import { WhatsAppInstanceStatus } from "@/types/whatsapp";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2, QrCode } from "lucide-react";

interface ConnectionStatusCardProps {
  status: WhatsAppInstanceStatus;
}

const STATUS_CONFIG: Record<WhatsAppInstanceStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Wifi;
  pulse?: boolean;
}> = {
  connected: {
    label: "Conectado",
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/30",
    icon: Wifi,
  },
  connecting: {
    label: "Conectando...",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
    icon: Loader2,
    pulse: true,
  },
  qr_pending: {
    label: "Aguardando QR Code",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    icon: QrCode,
    pulse: true,
  },
  disconnected: {
    label: "Desconectado",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/30",
    icon: WifiOff,
  },
};

export function ConnectionStatusCard({ status }: ConnectionStatusCardProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg border",
      config.bgColor
    )}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        config.bgColor
      )}>
        <Icon className={cn(
          "w-5 h-5",
          config.color,
          config.pulse && "animate-pulse"
        )} />
      </div>
      <div>
        <p className={cn("font-semibold", config.color)}>
          {config.label}
        </p>
        <p className="text-xs text-slate-500">
          {status === "connected" && "Pronto para enviar mensagens"}
          {status === "connecting" && "Estabelecendo conexão..."}
          {status === "qr_pending" && "Escaneie o QR Code com seu WhatsApp"}
          {status === "disconnected" && "Clique em 'Novo QR Code' para reconectar"}
        </p>
      </div>
    </div>
  );
}
