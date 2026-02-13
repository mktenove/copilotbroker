import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, Clock, Users, Plus, Trash2, GripVertical, Search, ChevronDown, ChevronUp, Filter, CheckSquare, Square } from "lucide-react";
import { useWhatsAppCampaigns } from "@/hooks/use-whatsapp-campaigns";
import { useProjects } from "@/hooks/use-projects";
import { useCustomOrigins } from "@/hooks/use-custom-origins";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { STATUS_CONFIG, LEAD_ORIGINS, getOriginDisplayLabel, LeadStatus } from "@/types/crm";
import { replaceTemplateVariables } from "@/types/whatsapp";
import type { CampaignStepInput } from "@/types/whatsapp";
import type { CRMLead } from "@/types/crm";

interface NewCampaignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStatus?: LeadStatus;
}

const ACTIVE_STATUSES: LeadStatus[] = ["new", "info_sent", "awaiting_docs", "docs_received"];

const DELAY_PRESETS = [
  { label: "Imediatamente", minutes: 0 },
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
  const { data: customOrigins = [] } = useCustomOrigins();
  const { role } = useUserRole();
  
  const [name, setName] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>(
    preselectedStatus ? [preselectedStatus] : []
  );
  const [projectId, setProjectId] = useState<string>("");
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [brokerFilterId, setBrokerFilterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Fetched leads from filters
  const [fetchedLeads, setFetchedLeads] = useState<CRMLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [excludedLeadIds, setExcludedLeadIds] = useState<Set<string>>(new Set());

  // Steps state
  const [steps, setSteps] = useState<CampaignStepInput[]>([
    { messageContent: "", delayMinutes: 0, useTemplate: true, templateId: "" }
  ]);

  // Fetch brokers for admin filter
  const { data: allBrokers = [] } = useQuery({
    queryKey: ["all-brokers-campaign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brokers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: role === "admin" && open,
  });

  // All origin options
  const allOriginOptions = useMemo(() => {
    const predefined = LEAD_ORIGINS.filter(o => o.key !== "outro").map(o => ({ key: o.key, label: o.label }));
    const custom = customOrigins.map(o => ({ key: o, label: o }));
    return [...predefined, ...custom, { key: "__sem_origem__", label: "Sem origem" }];
  }, [customOrigins]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setName("");
      setSelectedStatuses(preselectedStatus ? [preselectedStatus] : []);
      setProjectId("");
      setSelectedOrigins([]);
      setBrokerFilterId("");
      setSearchQuery("");
      setFetchedLeads([]);
      setExcludedLeadIds(new Set());
      setFiltersOpen(true);
      setSteps([{ messageContent: "", delayMinutes: 0, useTemplate: true, templateId: "" }]);
    }
  }, [open, preselectedStatus]);

  // Fetch leads when filters change
  useEffect(() => {
    const fetchLeads = async () => {
      if (selectedStatuses.length === 0) {
        setFetchedLeads([]);
        return;
      }
      
      setIsLoadingLeads(true);
      try {
        const leads = await fetchLeadsByStatus(
          selectedStatuses, 
          projectId || undefined,
          selectedOrigins.length > 0 ? selectedOrigins : undefined,
          brokerFilterId || undefined
        );
        setFetchedLeads(leads);
        // Reset exclusions when filters change
        setExcludedLeadIds(new Set());
      } catch (error) {
        setFetchedLeads([]);
      }
      setIsLoadingLeads(false);
    };
    
    fetchLeads();
  }, [selectedStatuses, projectId, selectedOrigins, brokerFilterId, fetchLeadsByStatus]);

  // Filtered leads by search
  const displayedLeads = useMemo(() => {
    if (!searchQuery.trim()) return fetchedLeads;
    const q = searchQuery.toLowerCase();
    return fetchedLeads.filter(l => 
      l.name.toLowerCase().includes(q) || l.whatsapp.includes(q)
    );
  }, [fetchedLeads, searchQuery]);

  const selectedCount = fetchedLeads.length - excludedLeadIds.size;
  const allSelected = fetchedLeads.length > 0 && excludedLeadIds.size === 0;

  const toggleStatus = (status: LeadStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleOrigin = (originKey: string) => {
    setSelectedOrigins(prev =>
      prev.includes(originKey)
        ? prev.filter(o => o !== originKey)
        : [...prev, originKey]
    );
  };

  const toggleLeadExclusion = (leadId: string) => {
    setExcludedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      // Deselect all
      setExcludedLeadIds(new Set(fetchedLeads.map(l => l.id)));
    } else {
      // Select all
      setExcludedLeadIds(new Set());
    }
  };

  const addStep = () => {
    setSteps(prev => [...prev, { 
      messageContent: "", 
      delayMinutes: 5,
      useTemplate: true, 
      templateId: "",
      sendIfReplied: false,
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

  // Estimate time
  const totalMessages = selectedCount * steps.length;
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
    selectedCount > 0 &&
    steps.length > 0 &&
    stepsValid;

  const handleSubmit = async () => {
    if (!isValid) return;

    const campaignSteps = steps.map(step => ({
      messageContent: step.useTemplate 
        ? (templates.find(t => t.id === step.templateId)?.content || "")
        : step.messageContent,
      delayMinutes: step.delayMinutes,
      templateId: step.useTemplate ? step.templateId : undefined,
      sendIfReplied: step.sendIfReplied || false,
    }));

    try {
      await createCampaign({
        name: name.trim(),
        targetStatus: selectedStatuses,
        projectId: projectId || undefined,
        origins: selectedOrigins.length > 0 ? selectedOrigins : undefined,
        brokerFilterId: brokerFilterId || undefined,
        excludedLeadIds: excludedLeadIds.size > 0 ? Array.from(excludedLeadIds) : undefined,
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
          <div className="mt-6 space-y-5">
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

            {/* Collapsible Filters */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-sm font-medium text-slate-300 hover:text-white transition-colors py-1">
                  <span className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros de leads
                  </span>
                  {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-3">
                {/* Status Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Status</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ACTIVE_STATUSES.map((status) => (
                      <label
                        key={status}
                        className="flex items-center gap-2 p-2 rounded-md bg-[#1a1a1d] border border-[#2a2a2e] cursor-pointer hover:border-[#3a3a3e] transition-colors"
                      >
                        <Checkbox
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={() => toggleStatus(status)}
                        />
                        <span className="text-xs text-slate-200">
                          {STATUS_CONFIG[status].label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Project Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Empreendimento</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="bg-[#1a1a1d] border-[#2a2a2e] text-white h-9 text-sm">
                      <SelectValue placeholder="Todos" />
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

                {/* Origin Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Origem</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-[#1a1a1d] border-[#2a2a2e] text-white h-9 text-sm hover:bg-[#2a2a2e]"
                      >
                        {selectedOrigins.length === 0
                          ? "Todas as origens"
                          : `${selectedOrigins.length} selecionada(s)`}
                        <ChevronDown className="w-3.5 h-3.5 ml-2 text-slate-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 bg-[#1e1e22] border-[#2a2a2e]" align="start">
                      <ScrollArea className="max-h-48">
                        <div className="space-y-0.5">
                          {allOriginOptions.map((origin) => (
                            <label
                              key={origin.key}
                              className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-[#2a2a2e] transition-colors"
                            >
                              <Checkbox
                                checked={selectedOrigins.includes(origin.key)}
                                onCheckedChange={() => toggleOrigin(origin.key)}
                              />
                              <span className="text-xs text-slate-200">{origin.label}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Broker Filter (admin only) */}
                {role === "admin" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Corretor</Label>
                    <Select value={brokerFilterId} onValueChange={setBrokerFilterId}>
                      <SelectTrigger className="bg-[#1a1a1d] border-[#2a2a2e] text-white h-9 text-sm">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1d] border-[#2a2a2e]">
                        <SelectItem value="all">Todos</SelectItem>
                        {allBrokers.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Lead List Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm">Leads selecionados</Label>
                {isLoadingLeads && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="bg-[#1a1a1d] border-[#2a2a2e] text-white h-8 text-xs pl-8"
                />
              </div>

              {/* Select all + counter */}
              {fetchedLeads.length > 0 && (
                <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-[#1a1a1d] border border-[#2a2a2e]">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors"
                    onClick={toggleSelectAll}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    Selecionar todos
                  </button>
                  <span className="text-xs text-slate-400">
                    {selectedCount} de {fetchedLeads.length}
                  </span>
                </div>
              )}

              {/* Lead list */}
              {fetchedLeads.length > 0 ? (
                <ScrollArea className="h-[220px] rounded-md border border-[#2a2a2e] bg-[#0f0f11]">
                  <div className="p-1 space-y-0.5">
                    {displayedLeads.map((lead) => {
                      const isSelected = !excludedLeadIds.has(lead.id);
                      return (
                        <label
                          key={lead.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-xs ${
                            isSelected ? "bg-[#1a1a1d] hover:bg-[#222226]" : "bg-transparent hover:bg-[#1a1a1d] opacity-50"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleLeadExclusion(lead.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 truncate font-medium">{lead.name}</p>
                            <p className="text-slate-500 text-[10px] truncate">
                              {lead.whatsapp}
                              {lead.project?.name && ` · ${lead.project.name}`}
                              {lead.lead_origin && ` · ${getOriginDisplayLabel(lead.lead_origin)}`}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {STATUS_CONFIG[lead.status]?.label?.split(" ")[0]}
                          </span>
                        </label>
                      );
                    })}
                    {displayedLeads.length === 0 && searchQuery && (
                      <p className="text-xs text-slate-500 text-center py-4">
                        Nenhum lead encontrado para "{searchQuery}"
                      </p>
                    )}
                  </div>
                </ScrollArea>
              ) : selectedStatuses.length > 0 && !isLoadingLeads ? (
                <p className="text-xs text-slate-500 text-center py-4 bg-[#0f0f11] rounded-md border border-[#2a2a2e]">
                  Nenhum lead encontrado com esses filtros
                </p>
              ) : !isLoadingLeads ? (
                <p className="text-xs text-slate-500 text-center py-4 bg-[#0f0f11] rounded-md border border-[#2a2a2e]">
                  Selecione ao menos um status acima
                </p>
              ) : null}
            </div>

            {/* Lead Count Summary */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-white font-medium">
                  {isLoadingLeads ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    <>
                      {selectedCount} lead{selectedCount !== 1 ? "s" : ""} × {steps.length} etapa{steps.length > 1 ? "s" : ""} = {totalMessages} mensagens
                    </>
                  )}
                </p>
                {selectedCount > 0 && (
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

                    {index > 0 && (
                      <>
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

                        <div className="flex items-center justify-between py-1.5">
                          <Label className="text-xs text-slate-400 cursor-pointer" htmlFor={`send-if-replied-${index}`}>
                            Enviar mesmo se o lead responder
                          </Label>
                          <Switch
                            id={`send-if-replied-${index}`}
                            checked={step.sendIfReplied || false}
                            onCheckedChange={(checked: boolean) => updateStep(index, { sendIfReplied: checked })}
                          />
                        </div>
                      </>
                    )}

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
