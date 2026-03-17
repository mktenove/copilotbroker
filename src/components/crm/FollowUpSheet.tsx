import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Send, Plus, Trash2, GripVertical, MessageCircle, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  replaceTemplateVariables,
  formatPhoneE164,
  isValidPhone,
  getRandomInterval,
} from "@/types/whatsapp";

interface FollowUpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadPhone: string;
  projectName?: string;
  brokerName?: string;
  brokerId: string;
  onCreated?: () => void;
}

const DELAY_PRESETS = [
  { label: "1 minuto", minutes: 1 },
  { label: "5 minutos", minutes: 5 },
  { label: "30 minutos", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "2 horas", minutes: 120 },
  { label: "6 horas", minutes: 360 },
  { label: "12 horas", minutes: 720 },
  { label: "24 horas", minutes: 1440 },
  { label: "2 dias", minutes: 2880 },
  { label: "3 dias", minutes: 4320 },
  { label: "7 dias", minutes: 10080 },
];

function formatDelay(minutes: number): string {
  if (minutes === 0) return "Imediatamente";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 1440)} dia(s)`;
}

export function FollowUpSheet({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadPhone,
  projectName,
  brokerName,
  brokerId,
  onCreated,
}: FollowUpSheetProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [steps, setSteps] = useState<Array<{ messageContent: string; delayMinutes: number; sendIfReplied?: boolean }>>([
    { messageContent: "", delayMinutes: 0 },
  ]);
  const [isSendNow, setIsSendNow] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [startTime, setStartTime] = useState("09:00");
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSteps([{ messageContent: "", delayMinutes: 0 }]);
      setIsSendNow(false);
      setStartDate(undefined);
      const now = new Date();
      setStartTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }
  }, [open]);

  const addStep = () => {
    setSteps((prev) => [...prev, { messageContent: "", delayMinutes: 5, sendIfReplied: false }]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<{ messageContent: string; delayMinutes: number; sendIfReplied: boolean }>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const getPreview = (step: { messageContent: string }) => {
    if (!step.messageContent) return "";
    return replaceTemplateVariables(step.messageContent, {
      nome: leadName.split(" ")[0],
      empreendimento: projectName || "",
      corretor_nome: brokerName?.split(" ")[0] || "Corretor",
    });
  };

  const stepsValid = steps.every((s) => s.messageContent.trim().length > 0);
  const dateValid = isSendNow || !!startDate;
  const isValid = steps.length > 0 && stepsValid && dateValid;

  const handleSubmit = async () => {
    if (!isValid || !isValidPhone(leadPhone)) {
      toast.error("Telefone do lead inválido");
      return;
    }

    setIsCreating(true);
    try {
      // Create campaign
      const { data: campaign, error: campErr } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          broker_id: brokerId,
          name: `Follow-up - ${leadName}`,
          status: "running",
          total_leads: steps.length,
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
        send_if_replied: i === 0 ? true : step.sendIfReplied || false,
      }));

      await supabase.from("campaign_steps").insert(stepsToInsert);

      // Schedule messages
      const phone = formatPhoneE164(leadPhone);
      let scheduledTime: Date;
      if (isSendNow) {
        scheduledTime = new Date(Date.now() + getRandomInterval());
      } else {
        const [h, m] = startTime.split(":").map(Number);
        scheduledTime = new Date(startDate!);
        scheduledTime.setHours(h, m, 0, 0);
      }

      const queueItems = steps.map((step, i) => {
        if (i > 0) {
          scheduledTime = new Date(scheduledTime.getTime() + step.delayMinutes * 60 * 1000 + Math.floor(Math.random() * 60) * 1000);
        }
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

      // Log interaction with full message content
      const stepsPreview = steps.map((s, i) => `Etapa ${i + 1}: ${s.messageContent}`).join("\n");
      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        interaction_type: "note_added" as any,
        channel: "whatsapp",
        notes: `Follow-up WhatsApp agendado (${steps.length} etapas):\n\n${stepsPreview}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      // Move lead to Copiloto (automatic follow-up stage)
      await supabase.from("leads").update({ status: "copiloto" }).eq("id", leadId);

      toast.success("Follow-up agendado com sucesso!");
      onCreated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar follow-up");
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
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              Agendar Follow-Up
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Sequência de mensagens WhatsApp para <span className="text-slate-200 font-medium">{leadName}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* Início do envio */}
          <div className="mt-6 rounded-lg border border-[#2a2a2e] bg-[#1a1a1d] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Início do envio
              </Label>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-400 cursor-pointer" htmlFor="send-now-toggle">Enviar agora</Label>
                <Switch id="send-now-toggle" checked={isSendNow} onCheckedChange={setIsSendNow} />
              </div>
            </div>

            {!isSendNow && (
              <div className="flex gap-3">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal bg-[#0f0f11] border-[#2a2a2e] h-9 text-sm",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#1e1e22] border-[#2a2a2e]" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => { setStartDate(d); setCalendarOpen(false); }}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-28 bg-[#0f0f11] border-[#2a2a2e] text-white h-9 text-sm"
                />
              </div>
            )}
          </div>

          <div className="mt-3 space-y-3">
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
                    </div>
                    {index > 0 && (
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
                            {DELAY_PRESETS.map((p) => (
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
                          <RadioGroupItem value="true" id={`fu-send-${index}`} />
                          <Label className="text-xs text-slate-400 cursor-pointer font-normal" htmlFor={`fu-send-${index}`}>Enviar mesmo que responda</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id={`fu-stop-${index}`} />
                          <Label className="text-xs text-slate-400 cursor-pointer font-normal" htmlFor={`fu-stop-${index}`}>Enviar somente se não responder</Label>
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
              {steps.length} etapa{steps.length > 1 ? "s" : ""} · 1 lead
            </p>
          </div>
        </div>

        <div className="border-t border-[#2a2a2e] bg-[#0f0f11] px-6 py-4 flex gap-3 mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-[#2a2a2e] text-slate-300">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isCreating} className="flex-1 bg-green-600 hover:bg-green-700">
            {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Agendar Follow-Up
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
