import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  XCircle, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Copy
} from "lucide-react";
import { WhatsAppCampaign, CampaignStatus } from "@/types/whatsapp";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignCardProps {
  campaign: WhatsAppCampaign;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onViewDetail: (campaign: WhatsAppCampaign) => void;
  onDuplicate: (campaign: WhatsAppCampaign) => void;
}

const STATUS_CONFIG: Record<CampaignStatus, { 
  label: string; 
  color: string; 
  icon: React.ComponentType<{ className?: string }>;
}> = {
  draft: { label: "Rascunho", color: "text-slate-400", icon: Clock },
  scheduled: { label: "Agendada", color: "text-blue-400", icon: Clock },
  running: { label: "Em andamento", color: "text-green-400", icon: Play },
  paused: { label: "Pausada", color: "text-yellow-400", icon: Pause },
  completed: { label: "Concluída", color: "text-emerald-400", icon: CheckCircle },
  cancelled: { label: "Cancelada", color: "text-red-400", icon: XCircle },
};

export function CampaignCard({ campaign, onPause, onResume, onCancel, onViewDetail, onDuplicate }: CampaignCardProps) {
  const rawStatus = campaign.status as CampaignStatus;
  
  // Derive visual status: if running but all sent, show as completed
  const status: CampaignStatus = 
    rawStatus === "running" && campaign.sent_count >= campaign.total_leads && campaign.total_leads > 0
      ? "completed"
      : rawStatus;
  
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  
  const progress = campaign.total_leads > 0 
    ? Math.round((campaign.sent_count / campaign.total_leads) * 100)
    : 0;
  
  const showProgress = status === "running" || status === "paused" || status === "completed";
  const canPause = rawStatus === "running" && campaign.sent_count < campaign.total_leads;
  const canResume = rawStatus === "paused";
  const canCancel = rawStatus === "running" || rawStatus === "paused" || rawStatus === "scheduled";

  return (
    <Card className="bg-[#1a1a1d] border-[#2a2a2e] overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn("w-4 h-4", config.color)} />
              <span className={cn("text-xs font-medium", config.color)}>
                {config.label}
              </span>
            </div>
            <h3 className="text-white font-medium mt-1">{campaign.name}</h3>
            {(campaign.project || campaign.broker) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {campaign.project?.name}
                {campaign.project && campaign.broker && " · "}
                {campaign.broker && `por ${campaign.broker.name}`}
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:bg-[#2a2a2e] hover:text-white"
              onClick={() => onViewDetail(campaign)}
              title="Ver detalhes"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:bg-[#2a2a2e] hover:text-white"
              onClick={() => onDuplicate(campaign)}
              title="Duplicar campanha"
            >
              <Copy className="w-4 h-4" />
            </Button>
            {canPause && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => onPause(campaign.id)}
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            {canResume && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-400 hover:bg-green-500/10"
                onClick={() => onResume(campaign.id)}
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
            {canCancel && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                onClick={() => onCancel(campaign.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        {showProgress && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{campaign.sent_count} de {campaign.total_leads} enviados</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded bg-[#0f0f11]">
            <p className="text-lg font-semibold text-white">{campaign.total_leads}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="p-2 rounded bg-[#0f0f11]">
            <p className="text-lg font-semibold text-green-400">{campaign.sent_count}</p>
            <p className="text-xs text-slate-500">Enviados</p>
          </div>
          <div className="p-2 rounded bg-[#0f0f11]">
            <p className="text-lg font-semibold text-red-400">{campaign.failed_count}</p>
            <p className="text-xs text-slate-500">Falhas</p>
          </div>
          <div className="p-2 rounded bg-[#0f0f11]">
            <p className="text-lg font-semibold text-blue-400">{campaign.reply_count}</p>
            <p className="text-xs text-slate-500">Respostas</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-[#2a2a2e] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {campaign.started_at 
              ? `Iniciada ${formatDistanceToNow(new Date(campaign.started_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}`
              : `Criada ${formatDistanceToNow(new Date(campaign.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}`
            }
          </span>
          {campaign.failed_count > 0 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs">{campaign.failed_count} falhas</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
