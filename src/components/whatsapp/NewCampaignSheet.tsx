import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Clock, Users } from "lucide-react";
import { useWhatsAppCampaigns } from "@/hooks/use-whatsapp-campaigns";
import { useProjects } from "@/hooks/use-projects";
import { STATUS_CONFIG, LeadStatus } from "@/types/crm";
import { replaceTemplateVariables } from "@/types/whatsapp";

interface NewCampaignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStatus?: LeadStatus;
}

const ACTIVE_STATUSES: LeadStatus[] = ["new", "info_sent", "awaiting_docs", "docs_received"];

export function NewCampaignSheet({ open, onOpenChange, preselectedStatus }: NewCampaignSheetProps) {
  const { broker, templates, isCreating, createCampaign, fetchLeadsByStatus } = useWhatsAppCampaigns();
  const { projects } = useProjects();
  
  const [name, setName] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>(
    preselectedStatus ? [preselectedStatus] : []
  );
  const [projectId, setProjectId] = useState<string>("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateId, setTemplateId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [leadCount, setLeadCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setName("");
      setSelectedStatuses(preselectedStatus ? [preselectedStatus] : []);
      setProjectId("");
      setUseTemplate(true);
      setTemplateId("");
      setCustomMessage("");
      setLeadCount(0);
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

  const selectedTemplate = templates.find(t => t.id === templateId);
  const messageContent = useTemplate ? selectedTemplate?.content || "" : customMessage;
  
  // Preview with sample data
  const previewMessage = replaceTemplateVariables(messageContent, {
    nome: "João",
    empreendimento: "GoldenView",
    corretor_nome: broker?.name?.split(" ")[0] || "Corretor",
  });

  // Estimate time
  const estimatedMinutes = Math.ceil(leadCount * 2.5); // Avg 150s per message
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;
  const estimatedTime = estimatedHours > 0 
    ? `~${estimatedHours}h ${remainingMinutes}min`
    : `~${estimatedMinutes}min`;

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }
    
    if (selectedStatuses.length === 0) {
      return;
    }
    
    if (useTemplate && !templateId) {
      return;
    }
    
    if (!useTemplate && !customMessage.trim()) {
      return;
    }

    try {
      await createCampaign({
        name: name.trim(),
        targetStatus: selectedStatuses,
        projectId: projectId || undefined,
        templateId: useTemplate ? templateId : undefined,
        customMessage: !useTemplate ? customMessage : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const isValid = name.trim() && 
    selectedStatuses.length > 0 && 
    leadCount > 0 &&
    ((useTemplate && templateId) || (!useTemplate && customMessage.trim()));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-[#0f0f11] border-[#2a2a2e] flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="text-white">Nova Campanha</SheetTitle>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto mt-6 space-y-6 pr-1 -mr-1">
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
                  `${leadCount} leads selecionados`
                )}
              </p>
              {leadCount > 0 && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  Tempo estimado: {estimatedTime}
                </p>
              )}
            </div>
          </div>

          {/* Message Type Toggle */}
          <div className="space-y-3">
            <Label className="text-slate-300">Mensagem</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={useTemplate ? "default" : "outline"}
                size="sm"
                onClick={() => setUseTemplate(true)}
                className={!useTemplate ? "border-[#2a2a2e] text-slate-300" : ""}
              >
                Usar template
              </Button>
              <Button
                type="button"
                variant={!useTemplate ? "default" : "outline"}
                size="sm"
                onClick={() => setUseTemplate(false)}
                className={useTemplate ? "border-[#2a2a2e] text-slate-300" : ""}
              >
                Escrever própria
              </Button>
            </div>
          </div>

          {/* Template or Custom Message */}
          {useTemplate ? (
            <div className="space-y-2">
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="bg-[#1a1a1d] border-[#2a2a2e] text-white">
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
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Digite sua mensagem... Use {nome}, {empreendimento}, {corretor_nome}"
                className="bg-[#1a1a1d] border-[#2a2a2e] text-white min-h-[100px]"
              />
              <p className="text-xs text-slate-500">
                Variáveis: {"{nome}"}, {"{empreendimento}"}, {"{corretor_nome}"}
              </p>
            </div>
          )}

          {/* Message Preview */}
          {messageContent && (
            <div className="space-y-2">
              <Label className="text-slate-300">Prévia da mensagem</Label>
              <div className="p-3 rounded-lg bg-[#1a1a1d] border border-[#2a2a2e]">
                <p className="text-sm text-slate-200 whitespace-pre-wrap">
                  {previewMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 pt-4 pb-6 mt-auto bg-gradient-to-t from-[#0f0f11] from-70% to-transparent -mx-6 px-6">
          <div className="flex gap-3">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
