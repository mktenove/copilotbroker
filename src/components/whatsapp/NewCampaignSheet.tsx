import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Clock, Users, Plus, Trash2, GripVertical } from "lucide-react";
import { useWhatsAppCampaigns } from "@/hooks/use-whatsapp-campaigns";
import { useProjects } from "@/hooks/use-projects";
import { STATUS_CONFIG, LeadStatus } from "@/types/crm";
import { replaceTemplateVariables } from "@/types/whatsapp";
import type { CampaignStepInput } from "@/types/whatsapp";

interface NewCampaignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStatus?: LeadStatus;
}

const ACTIVE_STATUSES: LeadStatus[] = ["new", "info_sent", "awaiting_docs", "docs_received"];

const DELAY_PRESETS = [
  { label: "Imediatamente", minutes: 0 },
  { label: "30 minutos", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "2 horas", minutes: 120 },
  { label: "6 horas", minutes: 360 },
  { label: "12 horas", minutes: 720 },
  { label: "24 horas", minutes: 1440 },
  { label: "2 dias", minutes: 2880 },
  { label: "3 dias", minutes: 4320 },
  { label: "5 dias", minutes: 7200 },
  { label: "7 dias", minutes: 10080 },
];

function formatDelay(minutes: number): string {
  if (minutes === 0) return "Imediatamente";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60}h`;
  return `${minutes / 1440} dia(s)`;
}

export function NewCampaignSheet({ open, onOpenChange, preselectedStatus }: NewCampaignSheetProps) {
  const { broker, templates, isCreating, createCampaign, fetchLeadsByStatus } = useWhatsAppCampaigns();
  const { projects } = useProjects();
  
  const [name, setName] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>(
    preselectedStatus ? [preselectedStatus] : []
  );
  const [projectId, setProjectId] = useState<string>("");
  const [leadCount, setLeadCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Steps state
  const [steps, setSteps] = useState<CampaignStepInput[]>([
    { messageContent: "", delayMinutes: 0, useTemplate: true, templateId: "" }
  ]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setName("");
      setSelectedStatuses(preselectedStatus ? [preselectedStatus] : []);
      setProjectId("");
      setLeadCount(0);
      setSteps([{ messageContent: "", delayMinutes: 0, useTemplate: true, templateId: "" }]);
    }
  }, [open, preselectedStatus]);

  // Fetch lead count when filters change
  useEffect(() => {
    const fetchCount = async () => {
      if (selectedStatuses.length === 0) {
        setLeadCount(0);
        return;
      }
      
      setIsLoadingCount(true);
      try {
        const leads = await fetchLeadsByStatus(
          selectedStatuses, 
          projectId || undefined
        );
        setLeadCount(leads.length);
      } catch (error) {
        setLeadCount(0);
      }
      setIsLoadingCount(false);
    };
    
    fetchCount();
  }, [selectedStatuses, projectId, fetchLeadsByStatus]);

  const toggleStatus = (status: LeadStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const addStep = () => {
    setSteps(prev => [...prev, { 
      messageContent: "", 
      delayMinutes: 1440, // Default 24h for subsequent steps
      useTemplate: true, 
      templateId: "" 
    }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<CampaignStepInput>) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, ...updates } : step));
  };

  const getStepMessage = (step: CampaignStepInput): string => {
    if (step.useTemplate && step.templateId) {
      const t = templates.find(t => t.id === step.templateId);
      return t?.content || "";
    }
    return step.messageContent;
  };

  const getPreview = (step: CampaignStepInput): string => {
    const content = getStepMessage(step);
    if (!content) return "";
    return replaceTemplateVariables(content, {
      nome: "João",
      empreendimento: "GoldenView",
      corretor_nome: broker?.name?.split(" ")[0] || "Corretor",
    });
  };

  // Estimate time (total messages = leads × steps)
  const totalMessages = leadCount * steps.length;
  const totalDelayMinutes = steps.reduce((sum, s) => sum + s.delayMinutes, 0);
  const sendingMinutes = Math.ceil(totalMessages * 2.5);
  const totalMinutes = sendingMinutes + totalDelayMinutes;
  const estimatedHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const estimatedTime = totalMinutes >= 1440
    ? `~${Math.ceil(totalMinutes / 1440)} dia(s)`
    : estimatedHours > 0 
      ? `~${estimatedHours}h ${remainingMinutes}min`
      : `~${totalMinutes}min`;

  const stepsValid = steps.every(step => {
    if (step.useTemplate) return !!step.templateId;
    return step.messageContent.trim().length > 0;
  });

  const isValid = name.trim() && 
    selectedStatuses.length > 0 && 
    leadCount > 0 &&
    steps.length > 0 &&
    stepsValid;

  const handleSubmit = async () => {
    if (!isValid) return;

    // Build steps for hook
    const campaignSteps = steps.map(step => ({
      messageContent: step.useTemplate 
        ? (templates.find(t => t.id === step.templateId)?.content || "")
        : step.messageContent,
      delayMinutes: step.delayMinutes,
      templateId: step.useTemplate ? step.templateId : undefined,
    }));

    try {
      await createCampaign({
        name: name.trim(),
        targetStatus: selectedStatuses,
        projectId: projectId || undefined,
        steps: campaignSteps,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-[#0f0f11] border-[#2a2a2e] flex flex-col h-full p-0">
        <div className="px-6 pt-6">
          <SheetHeader>
            <SheetTitle className="text-white">Nova Campanha</SheetTitle>
          </SheetHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="mt-6 space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label className="text-slate-300">Nome da campanha</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Follow-up Novos Leads"
                className="bg-[#1a1a1d] border-[#2a2a2e] text-white"
              />
            </div>

            {/* Status Selection */}
            <div className="space-y-3">
              <Label className="text-slate-300">Selecionar leads por status</Label>
              <div className="space-y-2">
                {ACTIVE_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e] cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <span className="text-sm text-slate-200">
                      {STATUS_CONFIG[status].label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <Label className="text-slate-300">Filtrar por empreendimento</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-[#1a1a1d] border-[#2a2a2e] text-white">
                  <SelectValue placeholder="Todos os empreendimentos" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                  <SelectItem value="all">Todos</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Count Summary */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-white font-medium">
                  {isLoadingCount ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    <>
                      {leadCount} leads × {steps.length} etapa{steps.length > 1 ? "s" : ""} = {totalMessages} mensagens
                    </>
                  )}
                </p>
                {leadCount > 0 && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Duração estimada: {estimatedTime}
                  </p>
                )}
              </div>
            </div>

            {/* Steps Builder */}
            <div className="space-y-3">
              <Label className="text-slate-300">Sequência de mensagens</Label>
              
              {steps.map((step, index) => (
                <div key={index}>
                  {/* Delay connector */}
                  {index > 0 && (
                    <div className="flex items-center gap-2 py-2 pl-4">
                      <div className="w-0.5 h-4 bg-[#2a2a2e]" />
                      <span className="text-xs text-slate-500">após {formatDelay(step.delayMinutes)}</span>
                    </div>
                  )}

                  <div className="rounded-lg border border-[#2a2a2e] bg-[#1a1a1d] p-4 space-y-3">
                    {/* Step header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-300">
                          Etapa {index + 1}
                        </span>
                      </div>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Delay selector (not for first step) */}
                    {index > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400">Enviar após</Label>
                        <Select 
                          value={String(step.delayMinutes)} 
                          onValueChange={(v) => updateStep(index, { delayMinutes: Number(v) })}
                        >
                          <SelectTrigger className="bg-[#0f0f11] border-[#2a2a2e] text-white h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                            {DELAY_PRESETS.filter(p => p.minutes > 0).map((preset) => (
                              <SelectItem key={preset.minutes} value={String(preset.minutes)}>
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Message type toggle */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={step.useTemplate ? "default" : "outline"}
                        size="sm"
                        className={`h-7 text-xs ${!step.useTemplate ? "border-[#2a2a2e] text-slate-300" : ""}`}
                        onClick={() => updateStep(index, { useTemplate: true })}
                      >
                        Template
                      </Button>
                      <Button
                        type="button"
                        variant={!step.useTemplate ? "default" : "outline"}
                        size="sm"
                        className={`h-7 text-xs ${step.useTemplate ? "border-[#2a2a2e] text-slate-300" : ""}`}
                        onClick={() => updateStep(index, { useTemplate: false })}
                      >
                        Personalizada
                      </Button>
                    </div>

                    {/* Template or custom */}
                    {step.useTemplate ? (
                      <Select 
                        value={step.templateId || ""} 
                        onValueChange={(v) => updateStep(index, { templateId: v })}
                      >
                        <SelectTrigger className="bg-[#0f0f11] border-[#2a2a2e] text-white h-9 text-sm">
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
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
                    )}

                    {/* Preview */}
                    {getPreview(step) && (
                      <div className="p-2.5 rounded bg-[#0f0f11] border border-[#2a2a2e]">
                        <p className="text-xs text-slate-400 mb-1">Prévia:</p>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap">
                          {getPreview(step)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add step button */}
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
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-[#2a2a2e] bg-[#0f0f11] px-6 py-4 flex gap-3 mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-[#2a2a2e] text-slate-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isCreating}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Iniciar Campanha
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
