import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, Play, Pause, CheckCircle, XCircle, Clock, 
  MessageSquare, Timer, ArrowDown, AlertTriangle 
} from "lucide-react";
import { WhatsAppCampaign, CampaignStatus } from "@/types/whatsapp";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CampaignDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: WhatsAppCampaign | null;
  onDuplicate: (campaign: WhatsAppCampaign, steps: CampaignStepRow[]) => void;
}

export interface CampaignStepRow {
  id: string;
  campaign_id: string;
  step_order: number;
  message_content: string;
  delay_minutes: number;
  send_if_replied: boolean;
  template_id: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<CampaignStatus, { 
  label: string; color: string; icon: React.ComponentType<{ className?: string }>;
}> = {
  draft: { label: "Rascunho", color: "text-slate-400", icon: Clock },
  scheduled: { label: "Agendada", color: "text-blue-400", icon: Clock },
  running: { label: "Em andamento", color: "text-green-400", icon: Play },
  paused: { label: "Pausada", color: "text-yellow-400", icon: Pause },
  completed: { label: "Concluída", color: "text-emerald-400", icon: CheckCircle },
  cancelled: { label: "Cancelada", color: "text-red-400", icon: XCircle },
};

function formatDelay(minutes: number): string {
  if (minutes === 0) return "Imediatamente";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${Math.floor(minutes / 1440)} dia(s)`;
}

export function CampaignDetailSheet({ open, onOpenChange, campaign, onDuplicate }: CampaignDetailSheetProps) {
  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ["campaign-steps", campaign?.id],
    queryFn: async () => {
      if (!campaign) return [];
      const { data, error } = await supabase
        .from("campaign_steps")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("step_order");
      if (error) throw error;
      return data as CampaignStepRow[];
    },
    enabled: !!campaign && open,
  });

  if (!campaign) return null;

  const rawStatus = campaign.status as CampaignStatus;
  const derivedStatus: CampaignStatus = 
    rawStatus === "running" && campaign.sent_count >= campaign.total_leads && campaign.total_leads > 0
      ? "completed" : rawStatus;
  const config = STATUS_CONFIG[derivedStatus];
  const StatusIcon = config.icon;
  const progress = campaign.total_leads > 0 
    ? Math.round((campaign.sent_count / campaign.total_leads) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-[#0f0f11] border-[#2a2a2e] flex flex-col h-full p-0">
        <div className="px-6 pt-6">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              Detalhes da Campanha
            </SheetTitle>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6 pb-4">
          <div className="mt-4 space-y-5">
            {/* Status + Name */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className={cn("w-4 h-4", config.color)} />
                <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
              {(campaign.project || campaign.broker) && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {campaign.project?.name}
                  {campaign.project && campaign.broker && " · "}
                  {campaign.broker && `por ${campaign.broker.name}`}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]">
                <p className="text-xl font-bold text-white">{campaign.total_leads}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div className="p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]">
                <p className="text-xl font-bold text-green-400">{campaign.sent_count}</p>
                <p className="text-xs text-slate-500">Enviados</p>
              </div>
              <div className="p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]">
                <p className="text-xl font-bold text-red-400">{campaign.failed_count}</p>
                <p className="text-xs text-slate-500">Falhas</p>
              </div>
              <div className="p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]">
                <p className="text-xl font-bold text-blue-400">{campaign.reply_count}</p>
                <p className="text-xs text-slate-500">Respostas</p>
              </div>
            </div>

            {/* Progress */}
            {(derivedStatus === "running" || derivedStatus === "paused" || derivedStatus === "completed") && (
              <div className="p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-[#2a2a2e] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            )}

            {/* Target Statuses */}
            {campaign.target_status && campaign.target_status.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Status alvo</p>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.target_status.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-[#1a1a1d] text-slate-300 border-[#2a2a2e] text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-1.5 text-xs text-slate-500">
              <p>Criada {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true, locale: ptBR })}</p>
              {campaign.started_at && (
                <p>Iniciada {formatDistanceToNow(new Date(campaign.started_at), { addSuffix: true, locale: ptBR })}</p>
              )}
              {campaign.completed_at && (
                <p>Concluída {formatDistanceToNow(new Date(campaign.completed_at), { addSuffix: true, locale: ptBR })}</p>
              )}
            </div>

            {/* Steps */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Sequência de mensagens ({steps.length} etapa{steps.length !== 1 ? "s" : ""})
              </p>

              {stepsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              ) : steps.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-500">
                    {campaign.custom_message 
                      ? "Mensagem única (sem etapas configuradas)" 
                      : "Nenhuma etapa encontrada"}
                  </p>
                  {campaign.custom_message && (
                    <div className="mt-3 p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e] text-left">
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{campaign.custom_message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-0">
                  {steps.map((step, index) => (
                    <div key={step.id}>
                      {index > 0 && (
                        <div className="flex items-center gap-2 py-2 pl-4">
                          <div className="flex flex-col items-center">
                            <div className="w-0.5 h-3 bg-[#2a2a2e]" />
                            <ArrowDown className="w-3 h-3 text-slate-600" />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Timer className="w-3 h-3" />
                            <span>após {formatDelay(step.delay_minutes)}</span>
                            {!step.send_if_replied && (
                              <span className="text-yellow-500/70 ml-1">· somente se não respondeu</span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="rounded-lg border border-[#2a2a2e] bg-[#1a1a1d] p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-slate-400">Etapa {step.step_order}</span>
                        </div>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {step.message_content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Warnings */}
            {campaign.failed_count > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs text-yellow-300">
                  {campaign.failed_count} mensagem(ns) falharam durante o envio.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[#2a2a2e] bg-[#0f0f11] px-6 py-4 flex gap-3 mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-[#2a2a2e] text-slate-300"
          >
            Fechar
          </Button>
          <Button
            onClick={() => onDuplicate(campaign, steps)}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicar Campanha
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
