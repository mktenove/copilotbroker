import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send, Plus, Trash2, GripVertical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  replaceTemplateVariables,
  formatPhoneE164,
  isValidPhone,
  getRandomInterval,
} from "@/types/whatsapp";

interface CadenciaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadPhone: string;
  projectName?: string;
  brokerName?: string;
  brokerId: string;
  leadStatus?: string;
  onCreated?: () => void;
}

const DELAY_PRESETS = [
  { label: "Imediato", minutes: 0 },
  { label: "30 minutos", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "3 horas", minutes: 180 },
  { label: "6 horas", minutes: 360 },
  { label: "12 horas", minutes: 720 },
  { label: "24 horas", minutes: 1440 },
  { label: "2 dias", minutes: 2880 },
  { label: "3 dias", minutes: 4320 },
  { label: "5 dias", minutes: 7200 },
  { label: "7 dias", minutes: 10080 },
  { label: "10 dias", minutes: 14400 },
];

function formatDelay(minutes: number): string {
  if (minutes === 0) return "Imediato";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 1440)} dia(s)`;
}

const DEFAULT_STEPS = [
  {
    messageContent: "Olá {nome}, tudo bem? Aqui é {corretor_nome}, da Enove Imobiliária! Recebi agora seu cadastro para saber mais sobre o {empreendimento}, já quis te chamar para te explicar como funciona! Foi você mesmo que se cadastrou?",
    delayMinutes: 0,
    sendIfReplied: true,
  },
  {
    messageContent: "Pode falar agora?",
    delayMinutes: 60,
    sendIfReplied: false,
  },
  {
    messageContent: "Tentei ligar para você, mas não consegui contato, qual melhor horário para falarmos?",
    delayMinutes: 180,
    sendIfReplied: false,
  },
  {
    messageContent: "Oi {nome}! Caso não esteja no momento certo, entenderei perfeitamente! Só acho que uma oportunidade dessas merece ser ouvida, caso queira fazer um bate papo sem compromisso, estarei aqui pra te ajudar.",
    delayMinutes: 1440,
    sendIfReplied: false,
  },
  {
    messageContent: "Percebi que você não está podendo falar comigo agora, em virtude disso, vou finalizar esse atendimento, mas fique a vontade de me chamar quando quiser!",
    delayMinutes: 2880,
    sendIfReplied: false,
  },
  {
    messageContent: "Ei! Não esqueci de ti! Lembrei de te chamar pois entrou uma condição que eu não poderia deixar de te mostrar, tem 20 minutos para uma video chamada? Prometo te apresentar algo que você nunca viu na vida!",
    delayMinutes: 7200,
    sendIfReplied: false,
  },
  {
    messageContent: "Oi {nome}! Voltei porque surgiu uma condição que muda totalmente o cenário desse projeto. Não estou enviando para todos, pois recebemos pouquíssimas unidades com uma condição realmente diferenciada, você tem 10 minutos hoje para entender?",
    delayMinutes: 14400,
    sendIfReplied: false,
  },
];

export function CadenciaSheet({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadPhone,
  projectName,
  brokerName,
  brokerId,
  leadStatus,
  onCreated,
}: CadenciaSheetProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [steps, setSteps] = useState<Array<{ messageContent: string; delayMinutes: number; sendIfReplied: boolean }>>(
    DEFAULT_STEPS.map(s => ({ ...s }))
  );

  useEffect(() => {
    if (open) {
      setSteps(DEFAULT_STEPS.map(s => ({ ...s })));
    }
  }, [open]);

  const addStep = () => {
    setSteps(prev => [...prev, { messageContent: "", delayMinutes: 1440, sendIfReplied: false }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<{ messageContent: string; delayMinutes: number; sendIfReplied: boolean }>) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const getPreview = (step: { messageContent: string }) => {
    if (!step.messageContent) return "";
    return replaceTemplateVariables(step.messageContent, {
      nome: leadName.split(" ")[0],
      empreendimento: projectName || "",
      corretor_nome: brokerName?.split(" ")[0] || "Corretor",
    });
  };

  const stepsValid = steps.every(s => s.messageContent.trim().length > 0);
  const isValid = steps.length > 0 && stepsValid;

  /**
   * Adjusts a scheduled date to fit within working hours (BRT = UTC-3).
   */
  const adjustToWorkingHours = (
    scheduledDate: Date,
    whStart: string,
    whEnd: string
  ): { adjusted: Date; wasAdjusted: boolean } => {
    const BRT_OFFSET = -3;
    const brtTime = new Date(scheduledDate.getTime() + BRT_OFFSET * 60 * 60 * 1000);

    const [startH, startM] = whStart.split(":").map(Number);
    const [endH, endM] = whEnd.split(":").map(Number);

    const currentMinutes = brtTime.getUTCHours() * 60 + brtTime.getUTCMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { adjusted: scheduledDate, wasAdjusted: false };
    }

    const targetBRT = new Date(brtTime);
    targetBRT.setUTCHours(startH, startM, 0, 0);

    if (currentMinutes > endMinutes) {
      targetBRT.setUTCDate(targetBRT.getUTCDate() + 1);
    }

    const adjustedUTC = new Date(targetBRT.getTime() - BRT_OFFSET * 60 * 60 * 1000);
    return { adjusted: adjustedUTC, wasAdjusted: true };
  };

  const handleSubmit = async () => {
    if (!isValid || !isValidPhone(leadPhone)) {
      toast.error("Telefone do lead inválido");
      return;
    }

    setIsCreating(true);
    try {
      // Check for existing active cadence
      const { data: existing } = await (supabase
        .from("whatsapp_campaigns")
        .select("id") as any)
        .eq("lead_id", leadId)
        .eq("status", "running")
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error("Já existe uma cadência ativa para este lead");
        setIsCreating(false);
        return;
      }

      // Fetch broker working hours
      const { data: instanceData } = await supabase
        .from("broker_whatsapp_instances")
        .select("working_hours_start, working_hours_end")
        .eq("broker_id", brokerId)
        .single();

      const whStart = instanceData?.working_hours_start || "09:00";
      const whEnd = instanceData?.working_hours_end || "21:00";

      // Create campaign with lead_id
      const { data: campaign, error: campErr } = await (supabase
        .from("whatsapp_campaigns") as any)
        .insert({
          broker_id: brokerId,
          name: `Cadência 10D - ${leadName}`,
          status: "running",
          total_leads: steps.length,
          lead_id: leadId,
        })
        .select()
        .single();

      if (campErr) throw campErr;

      // Insert steps
      const stepsToInsert = steps.map((step, i) => ({
        campaign_id: campaign.id,
        step_order: i + 1,
        message_content: step.messageContent,
        delay_minutes: i === 0 ? 0 : step.delayMinutes,
        send_if_replied: i === 0 ? true : step.sendIfReplied,
      }));

      await supabase.from("campaign_steps").insert(stepsToInsert);

      // Schedule messages with working hours adjustment
      const phone = formatPhoneE164(leadPhone);
      let scheduledTime = new Date(Date.now() + getRandomInterval());

      const queueItems = steps.map((step, i) => {
        if (i > 0) {
          scheduledTime = new Date(
            scheduledTime.getTime() + step.delayMinutes * 60 * 1000 + Math.floor(Math.random() * 60) * 1000
          );
        }

        // Apply working hours adjustment and chain from adjusted time
        const { adjusted } = adjustToWorkingHours(scheduledTime, whStart, whEnd);
        scheduledTime = adjusted;

        return {
          broker_id: brokerId,
          campaign_id: campaign.id,
          lead_id: leadId,
          phone,
          message: replaceTemplateVariables(step.messageContent, {
            nome: leadName.split(" ")[0],
            empreendimento: projectName || "",
            corretor_nome: brokerName?.split(" ")[0] || "Corretor",
          }),
          status: "scheduled",
          scheduled_at: scheduledTime.toISOString(),
          step_number: i + 1,
        };
      });

      const { error: qErr } = await supabase.from("whatsapp_message_queue").insert(queueItems);
      if (qErr) throw qErr;

      // Move lead to Atendimento if in Pré Atendimento
      if (leadStatus === "new") {
        await supabase.from("leads").update({
          status: "info_sent" as any,
          atendimento_iniciado_em: new Date().toISOString(),
          status_distribuicao: "atendimento_iniciado" as any,
        }).eq("id", leadId);

        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          interaction_type: "atendimento_iniciado" as any,
          old_status: "new" as any,
          new_status: "info_sent" as any,
          notes: "Lead movido para Atendimento ao ativar Cadência 10D",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      // Log interaction
      const stepsPreview = steps.map((s, i) => `Etapa ${i + 1} (${formatDelay(i === 0 ? 0 : s.delayMinutes)}): ${s.messageContent}`).join("\n");
      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "note_added" as any,
        channel: "whatsapp",
        notes: `⚡ Cadência 10D ativada (${steps.length} etapas):\n\n${stepsPreview}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      toast.success("Cadência 10D ativada!");
      onCreated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao ativar cadência");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-[#0f0f11] border-[#2a2a2e] flex flex-col h-full p-0">
        <div className="px-6 pt-6">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Cadência 10D™
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Sequência automática para <span className="text-slate-200 font-medium">{leadName}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <div key={index}>
                {index > 0 && (
                  <div className="flex items-center gap-2 py-2 pl-4">
                    <div className="w-0.5 h-4 bg-[#2a2a2e]" />
                    <span className="text-xs text-slate-500">após {formatDelay(step.delayMinutes)}</span>
                  </div>
                )}

                <div className="rounded-lg border border-[#2a2a2e] bg-[#1a1a1d] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-300">Etapa {index + 1}</span>
                      {index === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Imediato</span>}
                    </div>
                    {steps.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10" onClick={() => removeStep(index)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {index > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400">Enviar após</Label>
                        <Select value={String(step.delayMinutes)} onValueChange={(v) => updateStep(index, { delayMinutes: Number(v) })}>
                          <SelectTrigger className="bg-[#0f0f11] border-[#2a2a2e] text-white h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                            {DELAY_PRESETS.filter(p => p.minutes > 0).map((p) => (
                              <SelectItem key={p.minutes} value={String(p.minutes)}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <RadioGroup
                        value={step.sendIfReplied ? "true" : "false"}
                        onValueChange={(val) => updateStep(index, { sendIfReplied: val === "true" })}
                        className="space-y-1.5 py-1.5"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id={`cad-send-${index}`} />
                          <Label className="text-xs text-slate-400 cursor-pointer font-normal" htmlFor={`cad-send-${index}`}>Enviar mesmo que responda</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id={`cad-stop-${index}`} />
                          <Label className="text-xs text-slate-400 cursor-pointer font-normal" htmlFor={`cad-stop-${index}`}>Enviar somente se não responder</Label>
                        </div>
                      </RadioGroup>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Textarea
                      value={step.messageContent}
                      onChange={(e) => updateStep(index, { messageContent: e.target.value })}
                      placeholder="Digite sua mensagem... Use {nome}, {empreendimento}, {corretor_nome}"
                      className="bg-[#0f0f11] border-[#2a2a2e] text-white min-h-[80px] text-sm"
                    />
                    <p className="text-xs text-slate-600">
                      Variáveis: {"{nome}"}, {"{empreendimento}"}, {"{corretor_nome}"}
                    </p>
                  </div>

                  {getPreview(step) && (
                    <div className="p-2.5 rounded bg-[#0f0f11] border border-[#2a2a2e]">
                      <p className="text-xs text-slate-400 mb-1">Prévia:</p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{getPreview(step)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed border-[#2a2a2e] text-slate-400 hover:text-white hover:border-primary/50"
              onClick={addStep}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar etapa
            </Button>

            <p className="text-xs text-slate-400 text-center pt-1">
              {steps.length} etapa{steps.length > 1 ? "s" : ""} · Envio automático imediato
            </p>
          </div>
        </div>

        <div className="border-t border-[#2a2a2e] bg-[#0f0f11] px-6 py-4 flex gap-3 mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-[#2a2a2e] text-slate-300">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isCreating} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Ativar Cadência
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
